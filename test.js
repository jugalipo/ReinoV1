const lines = [
  "🍄 Cascada 🍄 20'",
  "Fecha",
  "Agenda semanal al PC",
  "🍄 Bloqueos 5'"
];
for (const line of lines) {
  const isEmoji = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(line);
  console.log(line, isEmoji);
}
