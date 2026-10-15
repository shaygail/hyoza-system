import { describe, expect, it } from "vitest";
import {
  extractTicketNumber,
  isAutomatedEmail,
  normalizeSubject,
  stripQuotedReply,
} from "@/domain/email-threading";
import { escapeHtml } from "@/lib/mailer";

describe("extractTicketNumber", () => {
  it("finds bracketed tags we add to outbound subjects", () => {
    expect(extractTicketNumber("RE: [OCSD-1042] New reply: Printer offline")).toBe("OCSD-1042");
    expect(extractTicketNumber("Fwd: [ocsd-7] hi")).toBe("OCSD-7");
  });

  it("accepts a bare reference only for known prefixes", () => {
    expect(extractTicketNumber("Update on OCSD-55 please", ["OCSD"])).toBe("OCSD-55");
    expect(extractTicketNumber("Update on OCSD-55 please")).toBeNull();
    expect(extractTicketNumber("Our PO ABC-123 attached", ["OCSD"])).toBeNull();
  });

  it("returns null for ordinary subjects", () => {
    expect(extractTicketNumber("Internet is down")).toBeNull();
  });
});

describe("normalizeSubject", () => {
  it("removes stacked reply / forward prefixes", () => {
    expect(normalizeSubject("RE: FW: Re: VPN not connecting")).toBe("VPN not connecting");
    expect(normalizeSubject("AW: Drucker")).toBe("Drucker");
    expect(normalizeSubject("Re[2]: Fibre install")).toBe("Fibre install");
  });
});

describe("stripQuotedReply", () => {
  it("cuts Gmail-style quoted history", () => {
    const body = "Thanks, that fixed it.\n\nOn Fri, 16 Oct 2026 at 10:00, Support <s@x.com> wrote:\n> old text";
    expect(stripQuotedReply(body)).toBe("Thanks, that fixed it.");
  });

  it("cuts Outlook header blocks", () => {
    const body = "Still broken.\r\n\r\nFrom: Support <s@x.com>\r\nSent: Friday\r\nSubject: x\r\n\r\nold";
    expect(stripQuotedReply(body)).toBe("Still broken.");
  });

  it("cuts at our own reply-above marker", () => {
    expect(stripQuotedReply("Ok!\n\nReply above this line to add to your ticket.\nHi John")).toBe("Ok!");
  });

  it("keeps the whole body if stripping would leave nothing", () => {
    expect(stripQuotedReply("> only quoted")).toBe("> only quoted");
  });
});

describe("isAutomatedEmail", () => {
  it("flags auto-replies, bulk mail and bounces", () => {
    expect(isAutomatedEmail({ "auto-submitted": "auto-replied" }, "a@b.com")).toBe(true);
    expect(isAutomatedEmail({ "x-autoreply": "yes" }, "a@b.com")).toBe(true);
    expect(isAutomatedEmail({ precedence: "bulk" }, "a@b.com")).toBe(true);
    expect(isAutomatedEmail({}, "MAILER-DAEMON@mx.example.com")).toBe(true);
    expect(isAutomatedEmail({}, "noreply@vendor.com")).toBe(true);
  });

  it("lets normal customer mail through", () => {
    expect(isAutomatedEmail({ "auto-submitted": "no" }, "jane@client.co.nz")).toBe(false);
    expect(isAutomatedEmail({}, "jane@client.co.nz")).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("neutralises markup in customer-supplied text", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
    expect(escapeHtml(null)).toBe("");
  });
});
