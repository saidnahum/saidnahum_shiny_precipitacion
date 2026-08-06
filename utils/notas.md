Se utiliza path de pathlib para construir rutas relativas al archivo para que pueda correr la app de manera correcta.

Se utiliza @reactive.calc para que no se recalculen en cada render calculos pesados.

Se utiliza prefer canvas por ser más liviano a la hora de pintar js en el
navegador ya que se tienen millones de datos.

Los datos de precipitación se unen y se realiza un cache (parquet) para que no se tenga que unir cada vez que se corre la app.