const CALLOUT_LABELS: Record<string, string> = {
  bash: '命令',
  danger: '危险',
  info: '信息',
  success: '成功',
  tip: '提示',
  warning: '警告'
}

export function convertObsidianMarkdown(source: string) {
  return source
    .replaceAll('\u00a0', ' ')
    .replace(/^# /gm, '## ')
    .replace(
      /^> \[!(bash|danger|info|success|tip|warning)\]\+?\s*(.*)$/gm,
      (_, type: string, title: string) =>
        `> **${CALLOUT_LABELS[type]}${title ? ` · ${title.trim()}` : ''}**`
    )
    .replace(
      /^> ((?:git|obsidian|python|node|npx|bun|npm|ANTHROPIC_[A-Z_]+=).*)$/gm,
      '> ```bash\n> $1\n> ```'
    )
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
