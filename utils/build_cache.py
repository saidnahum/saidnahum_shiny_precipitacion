from pathlib import Path
import geopandas as gpd
import pandas as pd

REPO_ROOT = Path(__file__).parent.parent
HEX_GRID_PATH = REPO_ROOT / "datos" / "malla_hex_10km.gpkg"
PRECIPITATION_PATH = REPO_ROOT / "datos" / "precipitacion_2050_ssp126.xlsx"
CACHE_PATH = REPO_ROOT / "datos" / "precip_hex.parquet"


# Construye el cache parquet a partir de los datos originales.
# Resultado: malla hexagonal + precipitación unidos por hex_id.
def main() -> None:
    print(f"Reading hex grid: {HEX_GRID_PATH}")
    grid = gpd.read_file(HEX_GRID_PATH)
    print(f"  -> {len(grid):,} hexagons")

    print(f"Reading precipitation: {PRECIPITATION_PATH}")
    precip = pd.read_excel(PRECIPITATION_PATH, sheet_name="datos")
    print(f"  -> {len(precip):,} rows")

    assert "hex_id" in grid.columns, "hex_id missing in grid"
    assert "hex_id" in precip.columns, "hex_id missing in precipitation"

    print("Merging on hex_id (left join)...")
    merged = grid.merge(precip, on="hex_id", how="left")

    print(f"Writing parquet cache: {CACHE_PATH}")
    merged.to_parquet(CACHE_PATH, index=False)
    size_mb = CACHE_PATH.stat().st_size / (1024 * 1024)
    print(f"  -> {size_mb:.1f} MB")

    print(f"Done. {len(merged):,} rows.")


if __name__ == "__main__":
    main()
