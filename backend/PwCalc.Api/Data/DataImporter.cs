using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace PwCalc.Api.Data;

/// <summary>
/// Loads the game data produced by calc_data/tools (items_calc.js, buffs_calc.js) into Postgres.
/// Runs on startup when the data files are newer than the imported version.
/// </summary>
public static class DataImporter
{
    public static async Task ImportAsync(AppDb db, string dataDir, ILogger log)
    {
        var itemsFile = Path.Combine(dataDir, "items_calc.js");
        var buffsFile = Path.Combine(dataDir, "buffs_calc.js");
        if (!File.Exists(itemsFile) || !File.Exists(buffsFile))
        {
            log.LogWarning("Data files not found in {Dir}; skipping import", dataDir);
            return;
        }

        var version = $"{File.GetLastWriteTimeUtc(itemsFile):O}|{File.GetLastWriteTimeUtc(buffsFile):O}";
        var current = await db.Meta.FindAsync("version");
        if (current?.Data == JsonSerializer.Serialize(version)) return;

        log.LogInformation("Importing game data from {Dir}", dataDir);
        var globals = ReadGlobals(itemsFile);
        foreach (var kv in ReadGlobals(buffsFile)) globals[kv.Key] = kv.Value;

        await using var tx = await db.Database.BeginTransactionAsync();
        await db.Items.ExecuteDeleteAsync();
        await db.Stones.ExecuteDeleteAsync();
        await db.Sets.ExecuteDeleteAsync();
        await db.Buffs.ExecuteDeleteAsync();
        await db.Meta.ExecuteDeleteAsync();

        foreach (var node in globals["PW_ITEMS"]!.AsArray())
        {
            var o = node!.AsObject();
            db.Items.Add(new Item
            {
                Id = (string)o["id"]!,
                Slot = (string)o["slot"]!,
                Name = (string)o["name"]!,
                Lvl = (int?)o["lvl"] ?? 0,
                Grade = (int?)o["gr"] ?? 0,
                ClassMask = (int?)o["cm"] ?? 0,
                Data = o.ToJsonString(),
            });
        }

        var sort = 0;
        foreach (var node in globals["PW_STONES"]!.AsArray())
        {
            var o = node!.AsObject();
            db.Stones.Add(new Stone { Id = (string)o["id"]!, Name = (string)o["name"]!, Sort = sort++, Data = o.ToJsonString() });
        }

        foreach (var (id, node) in globals["PW_SETS"]!.AsObject())
        {
            var o = node!.AsObject();
            db.Sets.Add(new ItemSet { Id = int.Parse(id), Name = (string)o["name"]!, Data = o.ToJsonString() });
        }

        var buffs = globals["PW_BUFFS"]!.AsObject();
        foreach (var (id, node) in buffs["skills"]!.AsObject())
        {
            var o = node!.AsObject();
            db.Buffs.Add(new Buff { Id = int.Parse(id), Name = (string)o["name"]!, Data = o.ToJsonString() });
        }
        db.Meta.Add(new Meta { Key = "buffClasses", Data = buffs["classes"]!.ToJsonString() });
        db.Meta.Add(new Meta { Key = "debuffs", Data = buffs["debuffs"]!.ToJsonString() });
        db.Meta.Add(new Meta { Key = "version", Data = JsonSerializer.Serialize(version) });

        await db.SaveChangesAsync();
        await tx.CommitAsync();
        log.LogInformation("Imported {Items} items", await db.Items.CountAsync());
    }

    /// <summary>Parses lines of the form <c>window.NAME = {json};</c>.</summary>
    static Dictionary<string, JsonNode?> ReadGlobals(string file)
    {
        var result = new Dictionary<string, JsonNode?>();
        foreach (var line in File.ReadLines(file))
        {
            if (!line.StartsWith("window.")) continue;
            var eq = line.IndexOf(" = ", StringComparison.Ordinal);
            var name = line[7..eq];
            var json = line[(eq + 3)..].TrimEnd().TrimEnd(';');
            result[name] = JsonNode.Parse(json);
        }
        return result;
    }
}
