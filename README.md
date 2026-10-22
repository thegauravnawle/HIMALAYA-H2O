# HIMALAYA-H2O
### Mapping and Manual Validation of High-Altitude Waterbody Candidates Using Google Earth Engine and QGIS

**Project author:** Gaurav Nawle  
**Field:** Remote Sensing & GIS  
**Project type:** Personal geospatial research and portfolio project

## Overview

HIMALAYA-H2O is a remote sensing and GIS project investigating high-altitude waterbody candidates in the Indian Himalayan region. It combines satellite-derived surface-water information, elevation-based screening, Sentinel-2 imagery, and manual interpretation in QGIS to identify locations that warrant further investigation.

The project explores how cloud-based geospatial processing can support the mapping and preliminary assessment of high-altitude lakes and other waterbodies.

## Research objectives

- Identify candidate waterbodies in terrain above a project-defined elevation threshold of 3,000 metres.
- Use historical surface-water information to develop an initial candidate inventory.
- Evaluate candidates using Sentinel-2 imagery, the Scene Classification Layer (SCL), and the Normalized Difference Water Index (NDWI).
- Manually review a subset of candidates and distinguish visible open-water evidence from uncertain cases, including snow/ice and river-related cases.
- Produce a documented GIS map and a review table suitable for further research.

## Study area and screening approach

The project focuses on high-altitude terrain in the Indian Himalayan region, with candidate locations concentrated in the western Himalaya.

The initial screening used an elevation threshold of 3,000 metres and a JRC Global Surface Water occurrence threshold of 50. These are project-specific screening parameters, not universal definitions of a high-altitude lake.

The resulting candidate inventory contains 750 waterbody candidates. A subset of 73 candidates was subsequently reviewed manually using Sentinel-2 imagery.

## Workflow

1. **Study area and terrain:** prepare the study region and elevation mask.
2. **Historical water baseline:** use JRC Global Surface Water information to identify areas with a historical surface-water signal.
3. **Candidate inventory:** derive and vectorize candidate waterbody areas.
4. **Sentinel-2 screening:** assess candidates using available imagery, SCL classes, and NDWI.
5. **Automated validation:** calculate candidate-level indicators to help prioritize manual inspection.
6. **Manual review:** inspect 73 candidates and record classifications and uncertainty notes.
7. **GIS visualization:** display reviewed candidates by classification in QGIS and prepare a map for reporting.

## Data and tools

- **Google Earth Engine:** satellite-data processing and candidate analysis.
- **JRC Global Surface Water:** historical surface-water information.
- **Sentinel-2 Surface Reflectance:** optical imagery for candidate assessment.
- **Elevation data:** terrain screening.
- **QGIS:** manual review, categorized mapping, and cartographic layout.
- **OpenStreetMap:** contextual basemap in the map layout.

See `docs/data_sources.md` for the exact dataset identifiers, versions, date ranges, and access links used in the final analysis.

## Indicators used

**Normalized Difference Water Index (NDWI)**

NDWI is calculated as:

NDWI = (Green − NIR) / (Green + NIR)

For Sentinel-2, the workflow uses the green and near-infrared bands. NDWI supports water interpretation but is not, by itself, proof that a candidate is a lake.

**Sentinel-2 Scene Classification Layer (SCL)**

SCL water and snow/ice classifications provide additional evidence for interpreting candidate locations. These classifications can be affected by terrain, mixed pixels, seasonal conditions, and image availability.

## Outputs

- Candidate waterbody inventory containing 750 candidates.
- Automated screening indicators for candidate prioritization.
- Manual review table covering 73 candidates.
- Categorized QGIS map of reviewed candidates.
- Google Earth Engine scripts and methodology documentation.

Final class totals and other quantitative results will be reported after checking the final manual-review CSV.

## Interpretation and limitations

This project produces a preliminary candidate inventory, not a fully validated census of Himalayan lakes.

- The elevation and water-occurrence thresholds are screening choices.
- Sentinel-2 observations represent the dates and conditions of available imagery; they do not establish long-term persistence by themselves.
- Snow and ice can obscure waterbodies or complicate classification.
- Rivers and channels can produce water-like spectral signals and must be distinguished from lakes by examining the candidate location.
- Manual interpretation introduces uncertainty.
- Visible open water does not establish glacial origin, and the project does not independently assess glacial connectivity or glacial-lake outburst flood risk.

Candidates with uncertain evidence should remain explicitly uncertain rather than being counted as confirmed lakes.

## Reproducibility

The `gee/` directory contains the processing scripts. The `qgis/` directory contains the GIS project and related documentation. The `data/` directory explains the review table and any required source-data access.

To reproduce the workflow, users will need access to Google Earth Engine, the source datasets, and a compatible QGIS installation. Processing parameters and dataset date ranges should be checked in the scripts before running the analysis.

## AI Assistance and Acknowledgment

AI tools were used to assist with writing and refining parts of the Google Earth Engine JavaScript code, including API usage, utility functions, and workflow improvements. This helped streamline development and improve productivity.

The project’s objectives, study approach, candidate review, interpretation of satellite imagery, validation decisions, and final presentation were developed and reviewed as part of the project workflow. AI-assisted code was used as a development aid, and outputs should be interpreted within the methodological limitations documented in this repository.

## Author

**Gaurav Nawle**  
B.Sc. Remote Sensing & GIS

This project is part of my geospatial learning portfolio, demonstrating practical experience with remote sensing, satellite-image interpretation, Google Earth Engine, and GIS cartography.
