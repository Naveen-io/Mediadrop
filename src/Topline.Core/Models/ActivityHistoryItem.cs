namespace Topline.Core.Models;

public record ActivityHistoryItem(
    string Id,
    ActivityCategory Category,
    string Title,
    string? Subtitle,
    string? IconGlyph,
    DateTimeOffset CompletedAt,
    string? ActionPath = null);
