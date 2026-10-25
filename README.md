# CamiloReading

Una app web para que un niño que habla español lea cuentos en inglés, a su ritmo y sin distracciones.

- **Biblioteca según sus gustos.** Al empezar elige sus temas (magia, aventuras, ciencia, animales, espacio, dinosaurios, deportes, misterio) y los cuentos que calzan aparecen primero.
- **Lectura tipo Kindle.** Texto limpio, con tamaño de letra, espacio entre líneas, tipo de letra y color de fondo ajustables (Papel, Sepia, Menta, Cielo, Noche o automático).
- **Toca una palabra** y el Profe Plumas (un búho mago) muestra:
  - cómo se lee, escrito "a la chilena" y lo más simple posible (`geologist → yi-á-lo-yist`, la sílaba fuerte en rojo);
  - un botón para **escucharla** en voz inglesa nativa (normal y lento);
  - un botón con su **significado** en español, y la frase completa traducida;
  - una estrella para guardarla en **Mis palabras**.
- **Frases completas.** En modo «Frase» se toca la primera y la última palabra (o se mantiene el dedo y se arrastra): aparece cómo se lee seguido y el audio fluido.
- **Escuchar en inglés o en español.** Lee el cuento completo en voz alta en cualquiera de los dos idiomas y marca en amarillo la palabra que va diciendo (en el texto en español cuando lee en español).
- **Español al lado.** Abre el cuento en español en un panel contiguo; lo que se selecciona en inglés se marca en verde en español.
- **Escuchar todo el cuento.** Lee el cuento completo en voz alta y va marcando la frase y la palabra donde va (también en el panel en español).

Funciona en el navegador (computador, tablet o celular) y no necesita servidor ni cuentas: lo que el niño guarda queda en ese mismo navegador.

## Publicarlo en GitHub Pages

1. Crea un repositorio nuevo en GitHub llamado `camiloreading` (público).
2. Sube todos estos archivos (en la web: *Add file → Upload files*, arrastra la carpeta completa), o desde la terminal:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/camiloreading.git
   git push -u origin main
   ```
3. En el repositorio: *Settings → Pages → Build and deployment → Source: Deploy from a branch*, rama `main`, carpeta `/ (root)`. Guarda.
4. En un minuto queda en `https://TU-USUARIO.github.io/camiloreading/`.

En el celular o tablet, ábrelo en el navegador y usa *Agregar a pantalla de inicio* para que quede como una app.

## Las voces en inglés

La app puede leer con **voces profesionales grabadas** (voces neuronales de Kokoro; por defecto dos: Heart y Michael). El niño elige la que más le gusta en el botón **Aa** y puede escuchar una muestra de cada una. Si no hay grabaciones, usa la voz del dispositivo.

**Generar las grabaciones (una sola vez, en tu computador):**

```bash
pip install kokoro-onnx numpy
# además necesitas ffmpeg:  brew install ffmpeg  /  sudo apt install ffmpeg  /  choco install ffmpeg
python3 tools/make_audio.py
```

- Por defecto graba **2 voces** (Heart, mujer, y Michael, hombre, ambas de EE.UU.) con el modelo liviano (~90 MB de descarga, que queda en `tools/models/` y no se sube a GitHub). Con 12 cuentos, la carpeta `audio/` pesa unos 10 MB, apta para una tablet.
- Con `--hq` usa el modelo completo (~300 MB): suena algo mejor, pero tarda unas 3 veces más.
- Se puede interrumpir y seguir después: lo que ya está grabado se salta.
- Crea la carpeta `audio/` y el archivo `data/audio.js`. Sube ambos a GitHub junto con el resto.
- **Las voces que indiques son las que ofrece la app.** Para una sola voz: `--voices af_heart`. Otras disponibles: `af_bella`, `am_adam` (EE.UU.), `bf_emma`, `bm_george` (Reino Unido), por ejemplo `--voices af_heart,bf_emma`. Las listas se editan al comienzo de `tools/make_audio.py`. Cada voz extra suma unos 5 MB y más tiempo de grabación.
- Cuando agregues cuentos nuevos, vuelve a ejecutarlo con las mismas voces: solo graba lo nuevo.
- **Voz en español:** también graba las oraciones en español con la voz Dora de Kokoro (unos 3 MB más), para el botón «Escuchar en español». Con `--es-voices em_alex` usa la voz de hombre, y con `--es-voices none` no graba español. Kokoro tiene pocas voces en español y suenan menos pulidas que las inglesas; si no te gusta, en **Aa** se puede elegir la voz en español del dispositivo.

Las palabras sueltas, las frases elegidas y «Escuchar todo el cuento» usan estas grabaciones. Las frases se recortan de la grabación de la oración, y el marcado palabra por palabra sigue una alineación aproximada calculada al grabar. Si una palabra o frase no tiene grabación, la app usa la voz del dispositivo en ese momento.

`python3 tools/make_audio.py --engine test-tone` genera pitidos en vez de voces; sirve solo para probar la app y **no** debe subirse.

**Voz del dispositivo (alternativa):** usa las voces que ya trae el aparato.

- *Android / Chrome:* "Google US English" o "Google UK English".
- *iPhone / iPad:* *Ajustes → Accesibilidad → Contenido leído → Voces → Inglés*, descarga una voz "Mejorada" (Samantha, Ava).
- *Windows:* las voces "Natural" de Edge.

## Agregar cuentos y palabras

Todo el contenido está en dos archivos de texto simples dentro de `content/`:

**`content/stories.txt`** — una oración por línea, inglés y español separados por `||`; una línea en blanco empieza un párrafo nuevo:

```
=== mi-cuento
title: The Brave Little Llama
title_es: La llamita valiente
tags: animales, aventuras
level: 1
emoji: 🦙
source: Original (CC0)
---
A little llama lived in the Andes. || Una llamita vivía en los Andes.
She was not afraid of the snow. || No le tenía miedo a la nieve.
```

**`content/dictionary.txt`** — una palabra por línea: `palabra | cómo se lee | significado`

```
llama | lá-ma | llama (el animal)
afraid | a-fréid | asustado (afraid of = con miedo de)
```

Después de editar, regenera los datos y revisa qué palabras faltan en el diccionario:

```bash
python3 tools/build.py --missing
```

Las palabras que no estén en el diccionario igual funcionan: la app propone una pronunciación aproximada y un enlace al traductor, pero lo ideal es agregarlas.

### Convenciones de pronunciación

| Se escribe | Suena como | Ejemplo |
|---|---|---|
| sílaba con tilde | la que suena más fuerte | `uí-serd` (wizard) |
| `j` | "h" suavecita, echando aire | `jaus` (house) |
| `z` | lengua entre los dientes ("th" de *three*) | `zri` (three) |
| `d` en the/this/that | "d" suave con la lengua entre los dientes | `dis` (this) |
| `y` | la "J" inglesa | `yamp` (jump) |
| `u` antes de vocal | "w" | `uó-ter` (water) |
| `sh` | como en "shampoo" | `shu` (shoe) |

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
