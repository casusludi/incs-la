 const RE = /\[([^\]]*)\]\(([^)]*)\)/g;

export function formatLinks(text){
    return text.replace(RE, '<a href="$2" target="_blank">$1</a>') 
}