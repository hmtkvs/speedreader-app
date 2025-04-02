export type EventCallback = () => void;

export interface Translation {
  text: string;
  example: string;
  language: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  background: string;
  text: string;
  highlight?: string;
  font?: string;
}

export const FONT_FAMILIES = [
  {
    id: 'system',
    name: 'System Default',
    value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  {
    id: 'georgia',
    name: 'Georgia',
    value: 'Georgia, serif'
  },
  {
    id: 'times',
    name: 'Times New Roman',
    value: '"Times New Roman", Times, serif'
  },
  {
    id: 'palatino',
    name: 'Palatino',
    value: '"Palatino Linotype", "Book Antiqua", Palatino, serif'
  },
  {
    id: 'garamond',
    name: 'Garamond',
    value: 'Garamond, serif'
  },
  {
    id: 'bookerly',
    name: 'Bookerly',
    value: 'Bookerly, Georgia, serif'
  }
];
export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'white-on-black',
    name: 'White on Black',
    background: '#171717',
    text: '#ffffff'
  },
  {
    id: 'black-on-white',
    name: 'Black on White',
    background: '#ffffff',
    text: '#171717'
  },
  {
    id: 'beige',
    name: 'Beige',
    background: '#f5f5dc',
    text: '#171717'
  },
  {
    id: 'black-on-white-max',
    name: 'Black on White Max',
    background: '#ffffff',
    text: '#000000'
  },
  {
    id: 'black-on-white-soft',
    name: 'Black on White Soft',
    background: '#f8fafc',
    text: '#171717'
  },
  {
    id: 'white-on-black-soft',
    name: 'White on Black Soft',
    background: '#374151',
    text: '#ffffff'
  },
  {
    id: 'black-on-blue',
    name: 'Black on Blue',
    background: '#bfdbfe',
    text: '#171717'
  },
  {
    id: 'black-on-blue-soft',
    name: 'Black on Blue Soft',
    background: '#dbeafe',
    text: '#171717'
  },
  {
    id: 'white-on-blue-soft',
    name: 'White on Blue Soft',
    background: '#1e3a8a',
    text: '#ffffff'
  }
];