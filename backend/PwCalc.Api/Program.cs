using System.Text;
using Microsoft.EntityFrameworkCore;
using PwCalc.Api.Data;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDb>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddResponseCompression(o => o.EnableForHttps = true);

var app = builder.Build();
app.UseResponseCompression();

// create the database and load the game data on first start (or when the data files change)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    await db.Database.EnsureCreatedAsync();
    var dataDir = Path.GetFullPath(builder.Configuration["DataDir"] ?? "../../data", app.Environment.ContentRootPath);
    await DataImporter.ImportAsync(db, dataDir, app.Logger);
}

// the built frontend (frontend/dist copied to wwwroot) when not running the Vite dev server
app.UseDefaultFiles();
app.UseStaticFiles();

// rows already hold json: glue them into an array without re-serialising
static IResult JsonRows(IEnumerable<string> rows)
{
    var sb = new StringBuilder("[");
    var first = true;
    foreach (var r in rows) { if (!first) sb.Append(','); sb.Append(r); first = false; }
    return Results.Content(sb.Append(']').ToString(), "application/json; charset=utf-8");
}

var api = app.MapGroup("/api");

// stones, sets and buffs are small: the client loads them once
api.MapGet("/meta", async (AppDb db) =>
{
    var stones = await db.Stones.OrderBy(s => s.Sort).Select(s => s.Data).ToListAsync();
    var sets = await db.Sets.Select(s => new { s.Id, s.Data }).ToListAsync();
    var buffs = await db.Buffs.Select(b => new { b.Id, b.Data }).ToListAsync();
    var meta = await db.Meta.ToDictionaryAsync(m => m.Key, m => m.Data);
    var sb = new StringBuilder("{\"stones\":[").AppendJoin(',', stones).Append("],\"sets\":{");
    sb.AppendJoin(',', sets.Select(s => $"\"{s.Id}\":{s.Data}"));
    sb.Append("},\"buffs\":{\"skills\":{").AppendJoin(',', buffs.Select(b => $"\"{b.Id}\":{b.Data}"));
    sb.Append("},\"classes\":").Append(meta.GetValueOrDefault("buffClasses", "{}"));
    sb.Append(",\"debuffs\":").Append(meta.GetValueOrDefault("debuffs", "[]")).Append("}}");
    return Results.Content(sb.ToString(), "application/json; charset=utf-8");
});

// item list for a slot: class filter, name search; items the character can wear come first (highest level first)
api.MapGet("/items", async (AppDb db, string slot, string? q, int? classBit, int level = 105, int take = 300) =>
{
    var query = db.Items.Where(i => i.Slot == slot);
    if (classBit is >= 0 and < 31)
    {
        var mask = 1 << classBit.Value;
        query = query.Where(i => i.ClassMask == 0 || (i.ClassMask & mask) != 0);
    }
    if (!string.IsNullOrWhiteSpace(q))
        query = query.Where(i => EF.Functions.ILike(i.Name, "%" + q.Trim().Replace("%", "\\%").Replace("_", "\\_") + "%"));
    var total = await query.CountAsync();
    var rows = await query
        .OrderBy(i => i.Lvl > level ? 1 : 0).ThenByDescending(i => i.Lvl).ThenByDescending(i => i.Grade).ThenBy(i => i.Name)
        .Take(Math.Clamp(take, 1, 1000)).Select(i => i.Data).ToListAsync();
    var sb = new StringBuilder($"{{\"total\":{total},\"items\":[").AppendJoin(',', rows).Append("]}");
    return Results.Content(sb.ToString(), "application/json; charset=utf-8");
});

// items by id (equipped / inventory)
api.MapGet("/items/by-ids", async (AppDb db, string ids) =>
{
    var list = ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Distinct().Take(200).ToList();
    return JsonRows(await db.Items.Where(i => list.Contains(i.Id)).Select(i => i.Data).ToListAsync());
});

// saved builds
api.MapGet("/builds", async (AppDb db) =>
    await db.Builds.OrderByDescending(b => b.UpdatedAt).Select(b => new { b.Id, b.Name, b.UpdatedAt }).ToListAsync());

api.MapGet("/builds/{id:guid}", async (AppDb db, Guid id) =>
    await db.Builds.FindAsync(id) is { } b
        ? Results.Content($"{{\"id\":\"{b.Id}\",\"name\":{System.Text.Json.JsonSerializer.Serialize(b.Name)},\"data\":{b.Data}}}", "application/json; charset=utf-8")
        : Results.NotFound());

api.MapPost("/builds", async (AppDb db, BuildDto dto) =>
{
    var now = DateTime.UtcNow;
    var b = new Build { Id = Guid.NewGuid(), Name = dto.Name.Trim()[..Math.Min(dto.Name.Trim().Length, 60)], Data = dto.Data.GetRawText(), CreatedAt = now, UpdatedAt = now };
    db.Builds.Add(b);
    await db.SaveChangesAsync();
    return Results.Ok(new { b.Id, b.Name, b.UpdatedAt });
});

api.MapPut("/builds/{id:guid}", async (AppDb db, Guid id, BuildDto dto) =>
{
    if (await db.Builds.FindAsync(id) is not { } b) return Results.NotFound();
    b.Name = dto.Name.Trim()[..Math.Min(dto.Name.Trim().Length, 60)];
    b.Data = dto.Data.GetRawText();
    b.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(new { b.Id, b.Name, b.UpdatedAt });
});

api.MapDelete("/builds/{id:guid}", async (AppDb db, Guid id) =>
    await db.Builds.Where(b => b.Id == id).ExecuteDeleteAsync() > 0 ? Results.NoContent() : Results.NotFound());

app.MapFallbackToFile("index.html");
app.Run();

record BuildDto(string Name, System.Text.Json.JsonElement Data);
