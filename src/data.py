from pathlib import Path
import geopandas as gpd

# Referencia de los archivos fuente.
HEX_GRID_PATH = Path(__file__).parent.parent / "datos" / "malla_hex_10km.gpkg"
PRECIPITATION_PATH = (
    Path(__file__).parent.parent / "datos" / "precipitacion_2050_ssp126.xlsx"
)

# Cache de los datos ya unidos
MERGED_CACHE_PATH = Path(__file__).parent.parent / "datos" / "precip_hex.parquet"

def load_merged_data() -> gpd.GeoDataFrame:
    if not MERGED_CACHE_PATH.exists():
        raise FileNotFoundError(
            f"Cache file not found: {MERGED_CACHE_PATH}\n"
            "Run `python utils/build_cache.py` to generate it."
        )
    return gpd.read_parquet(MERGED_CACHE_PATH)


def list_states() -> list[str]:
    gdf = load_merged_data()
    return sorted(gdf["estado"].dropna().unique().tolist())


def filter_by_state(estado: str) -> gpd.GeoDataFrame:
    gdf = load_merged_data()
    return gdf[gdf["estado"] == estado].copy()


def compute_stats(gdf) -> dict:
    series = gdf["precipitacion_mm_anio"].dropna()
    if series.empty:
        return {"count": 0, "mean": 0.0, "min": 0.0, "max": 0.0}
    return {
        "count": int(series.count()),
        "mean": float(series.mean()),
        "min": float(series.min()),
        "max": float(series.max()),
    }


# Obtención de los valores máximo y mínimo de precipitación de todo el dataset para la barra de color. 
# Se cachea para que no se tenga que calcular cada vez que se llama a la función.

_GLOBAL_RANGE: tuple[float, float] | None = None

def get_global_range(value_col: str = "precipitacion_mm_anio") -> tuple[float, float]:
    global _GLOBAL_RANGE
    if _GLOBAL_RANGE is None:
        gdf = load_merged_data()
        series = gdf[value_col].dropna()
        _GLOBAL_RANGE = (float(series.min()), float(series.max()))
    return _GLOBAL_RANGE

