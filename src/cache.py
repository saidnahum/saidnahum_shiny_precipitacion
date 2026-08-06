from threading import Lock

# estado name (or "__all__") -> GeoJSON string
_CACHE: dict[str, str] = {}
_LOCK = Lock()

# Verificacion de que el cache se esta utilizando correctamente.
def get_or_build(gdf, key: str) -> str:
    cached = _CACHE.get(key)
    if cached is not None:
        return cached

    with _LOCK:
        cached = _CACHE.get(key)
        if cached is not None:
            return cached
        json_str = gdf.to_json()
        _CACHE[key] = json_str
        return json_str

# Limpiar cache.
def clear() -> None:
    with _LOCK:
        _CACHE.clear()

# Cache de estadisticas de los datos.
def stats() -> dict:
    with _LOCK:
        total_bytes = sum(len(v) for v in _CACHE.values())
        return {
            "entries": len(_CACHE),
            "keys": sorted(_CACHE.keys()),
            "total_bytes": total_bytes,
        }
