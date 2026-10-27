# Composición de menús v0.1.002

Base: menú real de Preparación, con sus 39 capas, las 20 casillas, visor y panel derecho en sus posiciones originales. La vista usa `GenesisPreparation.open` y clona su artboard para componer Inventario, Fabricaciones y Comparación. La pestaña Preparación ejecuta el minijuego original sobre existencias de muestra.

Inventario permite seleccionar mineral o lingote, consultar existencias y navegar al proceso correspondiente. Incluye estado vacío para creaciones. Fabricaciones permite seleccionar una familia y distribuye receta y datos en el panel derecho. Comparación incluye selección A/B y estado vacío hasta disponer de creaciones.

Esta primera composición no conecta los tres menús con la partida. Los modelos finales de creaciones y sus valores reales quedan pendientes. Los materiales se muestran como PNG. No se exponen conocimiento, refinamiento ni técnicas sin descubrir.

Comprobado en Chromium: tres pestañas, conservación de los veinte marcos, inicio del minijuego original con tres intensidades y escalado uniforme en 390×844 y 844×390. Revisión visual de las tres pantallas en 1536×1060.
