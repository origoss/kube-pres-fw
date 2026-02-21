// Slide Ship Theme Configuration
// Customize the look and feel of your presentation

export interface ThemeConfig {
  // Background settings
  background: {
    type: 'stars' | 'grid' | 'solid';
    color: string;
    starCount?: number;
  };

  // Text styling
  text: {
    headingColor: string;
    bodyColor: string;
    accentColor: string;
  };

  // Starship appearance
  starship: {
    color: string;
    glowColor: string;
  };

  // Laser color
  laser: {
    color: string;
    glowColor: string;
  };
}

// Default space theme
export const theme: ThemeConfig = {
  background: {
    type: 'stars',
    color: '#0a0a1a',
    starCount: 150,
  },
  text: {
    headingColor: '#00ffff',
    bodyColor: '#aaccff',
    accentColor: '#ffffff',
  },
  starship: {
    color: '#326ce5',
    glowColor: '#00aaff',
  },
  laser: {
    color: '#00ffff',
    glowColor: '#00ffff',
  },
};

export default theme;
