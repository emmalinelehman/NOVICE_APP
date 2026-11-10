// Photos for suggested interests (Unsplash). Custom interests get a styled fallback.
const photos: Record<string, string> = {
  "wheel pottery": "https://images.unsplash.com/photo-1749835521236-d29d0004162d?auto=format&fit=crop&w=900&q=82",
  "urban foraging": "https://images.unsplash.com/photo-1790272688033-d55e4ac86c61?auto=format&fit=crop&w=900&q=82",
  "partner dancing": "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=900&q=82",
  "film photography": "https://images.unsplash.com/photo-1788072793619-e8268727b63b?auto=format&fit=crop&w=900&q=82",
  "kayaking": "https://images.unsplash.com/photo-1670520616431-99e4d37587be?auto=format&fit=crop&w=900&q=82",
  "sourdough baking": "https://images.unsplash.com/photo-1782281914057-95fb85134aa0?auto=format&fit=crop&w=900&q=82",
  "birding": "https://images.unsplash.com/photo-1790272687993-e9c456bb96b8?auto=format&fit=crop&w=900&q=82",
  "improv comedy": "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=82",
  "sewing a garment": "https://images.unsplash.com/photo-1788033955883-e7e938162658?auto=format&fit=crop&w=900&q=82",
  "bouldering": "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=82",
  "watercolor painting": "https://images.unsplash.com/photo-1673252413454-162352c3df01?auto=format&fit=crop&w=900&q=82",
  "pickleball": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=82",
  "mushroom growing": "https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=900&q=82",
  "pasta from scratch": "https://images.unsplash.com/photo-1742197682412-44c5c668e10b?auto=format&fit=crop&w=900&q=82",
  "open-water swimming": "https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?auto=format&fit=crop&w=900&q=82",
  "woodworking": "https://images.unsplash.com/photo-1569339323175-2f761c3f143b?auto=format&fit=crop&w=900&q=82",
  "stargazing": "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=82",
  "dj basics": "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?auto=format&fit=crop&w=900&q=82",
  "community gardening": "https://images.unsplash.com/photo-1611322470373-9708127d923f?auto=format&fit=crop&w=900&q=82",
  "screen printing": "https://images.unsplash.com/photo-1673339066658-1b36cea3054c?auto=format&fit=crop&w=900&q=82",
  "stand-up comedy": "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=900&q=82",
  "trail running": "https://images.unsplash.com/photo-1626017038489-a78543725b10?auto=format&fit=crop&w=900&q=82",
};

export function photoFor(name: string): string | undefined {
  return photos[name.trim().toLowerCase()];
}

export const welcomePhoto = photos["kayaking"]!;
