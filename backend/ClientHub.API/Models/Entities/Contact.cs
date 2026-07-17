namespace ClientHub.API.Models.Entities;

public class Contact
{
    public int      Id        { get; set; }
    public string   Name      { get; set; } = "";
    public string   Email     { get; set; } = "";
    public string?  Company   { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Conversation> Conversations { get; set; } = [];
}
