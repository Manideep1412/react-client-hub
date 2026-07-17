using ClientHub.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClientHub.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User>         Users         => Set<User>();
    public DbSet<Contact>      Contacts      => Set<Contact>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message>      Messages      => Set<Message>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<User>().HasIndex(u => u.Email).IsUnique();
        mb.Entity<Contact>().HasIndex(c => c.Email).IsUnique();

        mb.Entity<Conversation>()
          .HasOne(c => c.Contact).WithMany(ct => ct.Conversations).HasForeignKey(c => c.ContactId);

        mb.Entity<Conversation>()
          .HasOne(c => c.AssignedTo).WithMany().HasForeignKey(c => c.AssignedToId)
          .OnDelete(DeleteBehavior.SetNull);

        mb.Entity<Message>()
          .HasOne(m => m.Conversation).WithMany(c => c.Messages).HasForeignKey(m => m.ConversationId);

        mb.Entity<Message>()
          .HasOne(m => m.Sender).WithMany(u => u.Messages).HasForeignKey(m => m.SenderId)
          .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Conversation>().Property(c => c.Status).HasConversion<string>();
        mb.Entity<Message>().Property(m => m.SenderType).HasConversion<string>();
    }
}
