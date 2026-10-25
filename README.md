# ReadStories

Una app web para que un niño que habla español lea cuentos en inglés, a su ritmo y sin distracciones.

## Fuentes de más cuentos libres

- Fábulas de Esopo, cuentos de los hermanos Grimm y de Andersen (dominio público): conviene **re-contarlos con vocabulario simple** en vez de copiar traducciones antiguas.
- [StoryWeaver](https://storyweaver.org.in) — miles de cuentos infantiles con licencia CC BY (indicar autor y fuente).
- [Project Gutenberg](https://www.gutenberg.org) — clásicos en dominio público (para lectores más avanzados).

Todos los cuentos incluidos son textos originales o versiones nuevas de cuentos tradicionales, liberados con **CC0** (sin derechos reservados). El Profe Plumas es un personaje original.

## Estructura

```
index.html          la app
css/style.css       estilos
js/app.js           lógica (sin dependencias)
content/            cuentos y diccionario en texto plano (se editan aquí)
data/               datos generados por tools/build.py
tools/build.py      convierte content/ en data/
tools/make_audio.py graba las voces (audio/ y data/audio.js)
audio/              grabaciones mp3 (se crea con make_audio.py)
assets/icon.svg     ícono
```

Licencia del código: MIT. Contenido: CC0.
