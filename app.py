from pathlib import Path
import datetime
import io
import time
from shiny import App, reactive, render, ui

from src.data import (
    compute_stats,
    filter_by_state,
    list_states,
    load_merged_data,
)
from src.map import build_map

def _metadata_dl() -> ui.Tag:
    return ui.tags.dl(
        ui.tags.dt("Fuente"),
        ui.tags.dd("precipitacion_2050_ssp126.xlsx (escenario CMIP6 SSP126)"),
        ui.tags.dt("Unidades"),
        ui.tags.dd("mm/año (precipitación media anual)"),
        ui.tags.dt("Malla"),
        ui.tags.dd("Hexágonos regulares de 10 km"),
        ui.tags.dt("Cobertura"),
        ui.tags.dd("32 estados de México (60,054 hexágonos)"),
        class_="footer-metadata-list",
    )


app_ui = ui.page_fluid(
    ui.tags.div(
        ui.tags.div(
            ui.tags.h2(
                ui.tags.span(
                    "Precipitación 2050 — SSP126",
                    id="app-title",
                ),
            ),
            class_="app-header",
            id="app-header",
        ),
        ui.tags.div(
            ui.tags.aside(
                ui.tags.div(
                    ui.tags.h4("Descripción"),
                    ui.tags.p(
                        "Malla hexagonal de 10 km con precipitación media anual proyectada "
                        "para México bajo el escenario SSP126."
                    ),
                    class_="control-group control-description",
                    id="control-description",
                ),
                ui.tags.div(
                    ui.tags.label("Estado", class_="control-label", for_="estado"),
                    ui.input_select(
                        "estado",
                        label=None,
                        choices={"__all__": "Todos los estados"},
                    ),
                    class_="control-group control-estado",
                ),
                
                ui.tags.div(
                    ui.output_ui("stats"),
                    class_="control-group",
                    id="stats-card",
                ),
                ui.tags.div(
                    ui.tags.h4("Metadatos"),
                    _metadata_dl(),
                    class_="app-metadata app-metadata--sidebar",
                    id="app-metadata-sidebar",
                ),
                ui.tags.div(
                    ui.download_button("download_csv", "Descargar CSV", class_="btn-download"),
                    class_="control-group",
                    id="download-btn",
                ),
                
                class_="app-toolbar",
            ),
            ui.tags.div(
                ui.tags.div(
                    ui.tags.div(class_="map-loader-spinner"),
                    ui.tags.span("Cargando datos…", class_="map-loader-text"),
                    class_="map-loader",
                    id="map-loader",
                ),
                ui.output_ui("map"),
                class_="app-main",
            ),
            class_="app-content",
        ),
        ui.tags.div(
            ui.tags.button(
                ui.tags.span("Metadatos", class_="footer-toggle-label"),
                ui.tags.span("▾", class_="footer-toggle-caret"),
                type="button",
                class_="footer-toggle",
                id="footer-toggle",
                **{"aria-expanded": "false", "aria-controls": "footer-metadata"},
            ),
            ui.tags.div(
                _metadata_dl(),
                id="footer-metadata",
                class_="footer-metadata",
                hidden=True,  # cerrado por default
            ),
            ui.tags.div(
                ui.tags.small(
                    f"© {datetime.date.today().year} ",
                    ui.tags.a(
                        "@saidnahum",
                        href="https://github.com/saidnahum",
                        target="_blank",
                        rel="noopener noreferrer",
                        class_="footer-brand-link",
                    ),
                    ". Todos los derechos reservados.",
                    class_="footer-brand",
                ),
            ),
            class_="app-footer",
        ),
        class_="app-layout",
    ),
    ui.tags.link(
        rel="stylesheet",
        href=f"/css/app.css?v={int(time.time() * 1000)}",
    ),
    ui.tags.link(
        rel="stylesheet",
        href=f"https://cdn.jsdelivr.net/npm/driver.js@1.8.0/dist/driver.css?v={int(time.time() * 1000)}",
    ),
    ui.tags.script("""
        window.addEventListener('message', function (e) {
            if (e.data && e.data.type === 'map-ready') {
                var el = document.getElementById('map-loader');
                if (el) el.classList.add('is-hidden');
            }
        });
        setTimeout(function () {
            var el = document.getElementById('map-loader');
            if (el) el.classList.add('is-hidden');
        }, 10000);
    """),
    ui.tags.script(
        src="https://cdn.jsdelivr.net/npm/driver.js@1.8.0/dist/driver.js.iife.min.js",
    ),
    ui.tags.script(src="/js/tour-parent.js"),
    ui.tags.script("""
        (function () {
            var btn = document.getElementById('footer-toggle');
            var panel = document.getElementById('footer-metadata');
            if (!btn || !panel) return;
            btn.addEventListener('click', function () {
                var isOpen = !panel.hidden;
                panel.hidden = isOpen;
                btn.setAttribute('aria-expanded', String(!isOpen));
                btn.classList.toggle('is-open', !isOpen);
            });
        })();
    """),
)

def server(input, output, session):
    estados = list_states()
    ui.update_select(
        "estado",
        choices={"__all__": "Todos los estados", **{e: e for e in estados}},
    )

    @reactive.calc
    def selected_estado():
        sel = input.estado()
        if not sel or sel == "__all__":
            return None
        return sel

    @reactive.calc
    def filtered():
        sel = selected_estado()
        if not sel:
            return load_merged_data()
        return filter_by_state(sel)

    @render.ui
    def map():
        return ui.HTML(build_map(filtered(), selected_estado=selected_estado()))

    @render.ui
    def stats():
        s = compute_stats(filtered())
        sel = selected_estado() or "Todos los estados"
        return ui.HTML(f"""
            <div class="stats">
                <span class="stat"><span class="stat-label">Hex</span>
                    <span class="stat-value">{s["count"]:,}</span></span>
                <span class="stat"><span class="stat-label">Prom</span>
                    <span class="stat-value">{s["mean"]:,.0f} mm/año</span></span>
                <span class="stat"><span class="stat-label">Min</span>
                    <span class="stat-value">{s["min"]:,.0f} mm/año</span></span>
                <span class="stat"><span class="stat-label">Max</span>
                    <span class="stat-value">{s["max"]:,.0f} mm/año</span></span>
            </div>
        """)

    @render.download(filename="precipitacion.csv")
    def download_csv():
        gdf = filtered()
        df = gdf.to_crs(epsg=4326).copy()
        df["geometry"] = df["geometry"].apply(lambda g: g.wkt)
        df.rename(columns={"geometry": "geometry_wkt"}, inplace=True)
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        yield buf.getvalue()

www_dir = Path(__file__).parent / "www"
app = App(app_ui, server, static_assets=str(www_dir))