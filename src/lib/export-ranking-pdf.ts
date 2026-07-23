import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { displayPlayerName } from "./player-name";
import type { Tournament, TournamentEntry } from "./types";

const STATUS_LABELS: Record<TournamentEntry["status"], string> = {
  active: "Attivo",
  standby: "Stand-by",
  in_challenge: "In sfida",
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

export function exportRankingPdf(
  tournament: Tournament,
  entries: TournamentEntry[],
  options?: { highlightTop?: number }
): void {
  const highlightTop = options?.highlightTop ?? 8;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const dateLabel = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 17, 17);
  doc.text("Race to Finals", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 107, 107);
  doc.text("Sporting Borgo Bagnolo", 14, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 17, 17);
  doc.text(tournament.name, 14, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 107, 107);
  doc.text(`Classifica · Top ${highlightTop} alle Finals · ${dateLabel}`, 14, 40);

  const body = [...entries]
    .sort((a, b) => a.position - b.position)
    .map((entry) => {
      const qualifies =
        entry.position <= highlightTop && entry.status !== "standby";
      return [
        String(entry.position),
        displayPlayerName(entry.name),
        String(entry.matches_played ?? 0),
        String(entry.wins ?? 0),
        String(entry.losses ?? 0),
        STATUS_LABELS[entry.status],
        qualifies ? "Qualificato" : "—",
      ];
    });

  autoTable(doc, {
    startY: 46,
    head: [["Pos.", "Giocatore", "Partite", "Vittorie", "Sconfitte", "Stato", "Finals"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.2,
      textColor: [17, 17, 17],
      lineColor: [197, 213, 198],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [17, 17, 17],
      textColor: [250, 250, 250],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 14, fontStyle: "bold" },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "center", cellWidth: 20 },
      5: { cellWidth: 24 },
      6: { cellWidth: 24 },
    },
    didParseCell(data) {
      if (data.section !== "body") return;
      const raw = data.row.raw;
      if (!Array.isArray(raw)) return;
      const position = Number(raw[0]);
      if (!Number.isNaN(position) && position <= highlightTop) {
        data.cell.styles.fillColor = [243, 246, 243];
      }
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 46;

  doc.setFontSize(8);
  doc.setTextColor(107, 107, 107);
  doc.text(
    "Generato da Race to Finals · Sporting Borgo Bagnolo",
    14,
    Math.min(finalY + 10, doc.internal.pageSize.getHeight() - 12)
  );

  const fileName = `classifica-${slugify(tournament.name) || "torneo"}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  doc.save(fileName);
}
