using Microsoft.EntityFrameworkCore;

namespace PwCalc.Api.Data;

/// <summary>Item from the game client (elements.data). Columns used for search; the full record is kept as jsonb.</summary>
public class Item
{
    public string Id { get; set; } = "";
    public string Slot { get; set; } = "";
    /// <summary>Item sub type from the client ("Важка броня", "Лук"…): the category filter.</summary>
    public string Sub { get; set; } = "";
    public string Name { get; set; } = "";
    public int Lvl { get; set; }
    public int Grade { get; set; }
    public int ClassMask { get; set; }
    public string Data { get; set; } = "{}";
}

public class Stone
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Sort { get; set; }
    public string Data { get; set; } = "{}";
}

public class ItemSet
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Data { get; set; } = "{}";
}

/// <summary>Buff or debuff (formulas from mypers.world, texts from the client).</summary>
public class Buff
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Data { get; set; } = "{}";
}

/// <summary>Small json documents: buff lists per class, debuff list, data version.</summary>
public class Meta
{
    public string Key { get; set; } = "";
    public string Data { get; set; } = "null";
}

/// <summary>Saved character build.</summary>
public class Build
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Data { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Stone> Stones => Set<Stone>();
    public DbSet<ItemSet> Sets => Set<ItemSet>();
    public DbSet<Buff> Buffs => Set<Buff>();
    public DbSet<Meta> Meta => Set<Meta>();
    public DbSet<Build> Builds => Set<Build>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Item>(e =>
        {
            e.ToTable("items");
            e.Property(x => x.Data).HasColumnType("jsonb");
            e.HasIndex(x => new { x.Slot, x.Lvl });
        });
        b.Entity<Stone>(e => { e.ToTable("stones"); e.Property(x => x.Data).HasColumnType("jsonb"); });
        b.Entity<ItemSet>(e =>
        {
            e.ToTable("item_sets");
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.Data).HasColumnType("jsonb");
        });
        b.Entity<Buff>(e =>
        {
            e.ToTable("buffs");
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.Data).HasColumnType("jsonb");
        });
        b.Entity<Meta>(e => { e.ToTable("meta"); e.HasKey(x => x.Key); e.Property(x => x.Data).HasColumnType("jsonb"); });
        b.Entity<Build>(e => { e.ToTable("builds"); e.Property(x => x.Data).HasColumnType("jsonb"); });
    }
}
