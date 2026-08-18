import logoUrl from '../../imagens/nlprod2023.png';

let logoDataUrlPromise = null;

export function carregarLogoProposta() {
    if (!logoDataUrlPromise) {
        logoDataUrlPromise = fetch(logoUrl)
            .then(response => response.blob())
            .then(blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }));
    }

    return logoDataUrlPromise;
}
