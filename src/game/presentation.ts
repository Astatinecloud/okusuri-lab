/** Keep Japanese closing punctuation with the preceding line. */
export function wrapJapanese(text: string, maxWidth: number, measure: (text: string) => number): string[] {
    const lines: string[] = [];
    let row = '';
    for (const char of text) {
        if (row && measure(row + char) > maxWidth && !'！、。？'.includes(char)) {
            lines.push(row);
            row = '';
        }
        row += char;
    }
    if (row)
        lines.push(row);
    return lines;
}
