using ClientHub.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClientHub.API.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await db.Database.MigrateAsync();
        if (await db.Users.AnyAsync()) return;

        // Agent / admin accounts
        var admin = new User { Email = "admin@clienthub.dev", FullName = "Admin User",  Role = "Admin", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123") };
        var agent = new User { Email = "agent@clienthub.dev", FullName = "Sarah Agent", Role = "Agent", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Agent@123") };
        db.Users.AddRange(admin, agent);
        await db.SaveChangesAsync();

        // Contacts
        var contacts = new[]
        {
            new Contact { Name = "Alice Johnson",  Email = "alice@acmecorp.com",   Company = "Acme Corp"      },
            new Contact { Name = "Bob Martinez",   Email = "bob@techsolutions.io", Company = "Tech Solutions" },
            new Contact { Name = "Carol Williams", Email = "carol@globalinc.com",  Company = "Global Inc"     },
            new Contact { Name = "David Kim",      Email = "david@startup.dev",    Company = "StartupDev"     },
            new Contact { Name = "Emma Davis",     Email = "emma@freelancer.me"                               },
        };
        db.Contacts.AddRange(contacts);
        await db.SaveChangesAsync();

        // Client portal users — one per contact so client messages have a real SenderId
        // Role = "Client" distinguishes them from agents; password not used in the demo
        var clientUsers = contacts.Select(c => new User
        {
            Email        = c.Email,
            FullName     = c.Name,
            Role         = "Client",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Client@123"),
        }).ToArray();
        db.Users.AddRange(clientUsers);
        await db.SaveChangesAsync();

        // Map contact email → client user for seed messages
        var clientByEmail = clientUsers.ToDictionary(u => u.Email);

        var now   = DateTime.UtcNow;
        var conv1 = new Conversation { ContactId = contacts[0].Id, Subject = "Need help with account setup",  Status = ConversationStatus.Open,    AssignedToId = admin.Id, CreatedAt = now.AddDays(-2), LastMessageAt = now.AddMinutes(-30) };
        var conv2 = new Conversation { ContactId = contacts[1].Id, Subject = "Billing inquiry for Q4",        Status = ConversationStatus.Pending,  AssignedToId = agent.Id, CreatedAt = now.AddDays(-1), LastMessageAt = now.AddHours(-2)   };
        var conv3 = new Conversation { ContactId = contacts[2].Id, Subject = "Integration API documentation", Status = ConversationStatus.Open,                             CreatedAt = now.AddHours(-5), LastMessageAt = now.AddMinutes(-10) };
        db.Conversations.AddRange(conv1, conv2, conv3);
        await db.SaveChangesAsync();

        db.Messages.AddRange(
            // conv1 — Alice / Admin
            new Message { ConversationId = conv1.Id, SenderId = clientByEmail["alice@acmecorp.com"].Id,   SenderType = SenderType.Client, Body = "Hi, I just signed up and I'm having trouble setting up my account. Can you help?",          CreatedAt = now.AddDays(-2).AddMinutes(5)  },
            new Message { ConversationId = conv1.Id, SenderId = admin.Id,                                  SenderType = SenderType.Agent,  Body = "Of course, Alice! I'd be happy to help. What specific issue are you running into?",            CreatedAt = now.AddDays(-2).AddMinutes(15) },
            new Message { ConversationId = conv1.Id, SenderId = clientByEmail["alice@acmecorp.com"].Id,   SenderType = SenderType.Client, Body = "I can't seem to verify my email address. The verification link keeps expiring.",               CreatedAt = now.AddMinutes(-30)            },

            // conv2 — Bob / Agent
            new Message { ConversationId = conv2.Id, SenderId = clientByEmail["bob@techsolutions.io"].Id, SenderType = SenderType.Client, Body = "Hello, I have a question about our invoice for this quarter. The amount seems higher than expected.", CreatedAt = now.AddDays(-1).AddMinutes(10) },
            new Message { ConversationId = conv2.Id, SenderId = agent.Id,                                  SenderType = SenderType.Agent,  Body = "Hi Bob! I'll look into the billing details right away. Could you share your account number?",  CreatedAt = now.AddHours(-2)               },

            // conv3 — Carol / Admin
            new Message { ConversationId = conv3.Id, SenderId = clientByEmail["carol@globalinc.com"].Id, SenderType = SenderType.Client, Body = "Can you point me to the API docs for webhooks? We're building an integration.",                CreatedAt = now.AddHours(-5)               },
            new Message { ConversationId = conv3.Id, SenderId = admin.Id,                                  SenderType = SenderType.Agent,  Body = "Sure! Here's the link to our webhook documentation: https://docs.clienthub.dev/webhooks",    CreatedAt = now.AddMinutes(-10)            }
        );
        await db.SaveChangesAsync();
    }
}
