// Only the formatting used by card lore and confirmation messages is retained.
// Rebuild each element in the HTML namespace instead of trusting AI/user markup.
export const sanitizeHtml = (html: string): string => {
    const source = new DOMParser().parseFromString(html, 'text/html');
    const output = document.createElement('div');
    const allowed = new Set(['BR', 'STRONG', 'B', 'EM', 'I', 'SPAN', 'P']);
    const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE']);
    const append = (node: Node, parent: HTMLElement) => {
        if (node.nodeType === Node.TEXT_NODE) {
            parent.appendChild(document.createTextNode(node.textContent || ''));
        } else if (node instanceof Element) {
            const tag = node.tagName.toUpperCase();
            if (blocked.has(tag)) return;
            let target = parent;
            if (node.namespaceURI === 'http://www.w3.org/1999/xhtml' && allowed.has(tag)) {
                target = document.createElement(tag.toLowerCase());
                if (tag === 'SPAN' && node.hasAttribute('class')) target.className = node.getAttribute('class')!;
                parent.appendChild(target);
            }
            node.childNodes.forEach(child => append(child, target));
        }
    };
    source.body.childNodes.forEach(node => append(node, output));
    return output.innerHTML;
};
