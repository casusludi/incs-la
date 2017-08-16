import xs from 'xstream';

import { html } from 'snabbdom-jsx';

// Permet d'aller récupérer les données d'un .json à partir de son chemin et de le renvoyer sous la forme d'un flux
export function JSONReader(sources) {

    // jsonPath$ emet le chemin du .json
    const {HTTP, jsonPath$} = sources;

    // Construit la requête à transmettre au driver HTTP
    // L'attribut 'category' est une clé permettant de retrouver la réponse une fois la requête envoyée
    // Il doit être unique, j'utilise donc simplement le chemin du .json en tant que clé
    const request$ = jsonPath$.map(jsonPath => ({
        url: jsonPath,
        category: jsonPath,
    }));

    // On utilise la méthode select du driver HTTP en lui transmettant la clé pour récupérer la réponse correspondante
    const response$ = jsonPath$.map(jsonPath =>
        HTTP.select(jsonPath)
        .flatten()
        .map(response => response.body)
    ).flatten().remember();

    const sinks = {
        request: request$, // La requête transmise au driver HTTP
        JSON: response$, // La réponse du fichier .json une fois reçue
    };

    return sinks;
}