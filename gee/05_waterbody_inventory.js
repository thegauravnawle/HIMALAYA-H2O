// ============================================================
// HIMALAYA-H2O
// PHASE 2C — WATERBODY INVENTORY
// ============================================================

// ------------------------------------------------------------
// 1. STUDY REGION
// ------------------------------------------------------------

var states = ee.FeatureCollection(
  'FAO/GAUL/2015/level1'
);

var studyStates = states
  .filter(
    ee.Filter.eq('ADM0_NAME', 'India')
  )
  .filter(
    ee.Filter.inList(
      'ADM1_NAME',
      [
        'Himachal Pradesh',
        'Uttarakhand'
      ]
    )
  );

var studyRegion = studyStates.geometry();


// ------------------------------------------------------------
// 2. DEM
// ------------------------------------------------------------

var dem = ee.Image(
  'USGS/SRTMGL1_003'
).select('elevation');


// ------------------------------------------------------------
// 3. HIGH-ALTITUDE MASK
// ------------------------------------------------------------

var highAltitude = dem.gte(3000);


// ------------------------------------------------------------
// 4. JRC GLOBAL SURFACE WATER
// ------------------------------------------------------------

var gsw = ee.Image(
  'JRC/GSW1_4/GlobalSurfaceWater'
);

var occurrence = gsw.select(
  'occurrence'
);


// ------------------------------------------------------------
// 5. WATERBODY CANDIDATE MASK
// ------------------------------------------------------------

var water = occurrence
  .gte(50)
  .and(highAltitude)
  .selfMask()
  .clip(studyRegion);


// ------------------------------------------------------------
// 6. REMOVE SMALL ISOLATED GROUPS
// ------------------------------------------------------------

var connected = water
  .updateMask(
    water.connectedPixelCount(
      100,
      true
    ).gte(8)
  );


// ------------------------------------------------------------
// 7. CONVERT CONNECTED WATER AREAS TO POLYGONS
// ------------------------------------------------------------

var waterbodies = connected
  .toInt()
  .reduceToVectors({
    geometry: studyRegion,
    scale: 30,
    geometryType: 'polygon',
    eightConnected: true,
    labelProperty: 'water',
    reducer: ee.Reducer.countEvery(),
    maxPixels: 1e10,
    bestEffort: true
  });


// ------------------------------------------------------------
// 8. CALCULATE WATERBODY PROPERTIES
// ------------------------------------------------------------

var inventory = waterbodies.map(
  function(feature) {

    var areaKm2 = feature
      .geometry()
      .area(1)
      .divide(1e6);

    var centroid = feature
      .geometry()
      .centroid(30);

    var coordinates = centroid
      .coordinates();

    var elevationStats = dem
      .reduceRegion({
        reducer:
          ee.Reducer.mean()
            .combine({
              reducer2:
                ee.Reducer.minMax(),
              sharedInputs: true
            }),
        geometry: feature.geometry(),
        scale: 30,
        maxPixels: 1e7,
        bestEffort: true
      });

    return feature.set({

      'area_km2': areaKm2,

      'longitude':
        coordinates.get(0),

      'latitude':
        coordinates.get(1),

      'mean_elevation_m':
        elevationStats.get('elevation_mean'),

      'min_elevation_m':
        elevationStats.get('elevation_min'),

      'max_elevation_m':
        elevationStats.get('elevation_max')
    });
  }
);


// ------------------------------------------------------------
// 9. REMOVE VERY SMALL FEATURES
// ------------------------------------------------------------

// Keep features >= 0.01 km²
// (~1 hectare)
//
// This is a working inventory threshold,
// not a claim that these are confirmed lakes.

var inventoryFiltered = inventory
  .filter(
    ee.Filter.gte(
      'area_km2',
      0.01
    )
  );


// ------------------------------------------------------------
// 10. ADD WATERBODY IDs
// ------------------------------------------------------------

var inventoryWithID =
  inventoryFiltered.map(
    function(feature) {

      var id = ee.String(
        'WB_'
      ).cat(
        ee.String(
          feature.get('system:index')
        )
      );

      return feature.set(
        'waterbody_id',
        id
      );
    }
  );


// ------------------------------------------------------------
// 11. DISPLAY
// ------------------------------------------------------------

Map.centerObject(
  studyRegion,
  7
);

Map.addLayer(
  inventoryWithID,
  {
    color: '00ffff'
  },
  'Waterbody Inventory'
);


// ------------------------------------------------------------
// 12. PRINT INVENTORY
// ------------------------------------------------------------

print(
  'Waterbody inventory:',
  inventoryWithID
);

print(
  'Number of candidate waterbodies:',
  inventoryWithID.size()
);


// ------------------------------------------------------------
// 13. PRINT FIRST 20 RECORDS
// ------------------------------------------------------------

print(
  'First 20 waterbody records:',
  inventoryWithID.limit(20)
);


// ------------------------------------------------------------
// 14. TOTAL INVENTORY AREA
// ------------------------------------------------------------

var totalArea = inventoryWithID
  .aggregate_sum(
    'area_km2'
  );

print(
  'Total inventoried water area (km²):',
  totalArea
);


// ------------------------------------------------------------
// 15. EXPORT CSV
// ------------------------------------------------------------

Export.table.toDrive({
  collection: inventoryWithID,
  description:
    'HIMALAYA_H2O_Waterbody_Inventory',
  fileFormat: 'CSV'
});
