export interface AvatarItem {
  id: string;
  name: string;
  url: string;
}

export const AVATARS_LIST: AvatarItem[] = [
  {
    id: 'avatar_1',
    name: 'Sweet Asian Beauty (Default)',
    url: '/avatars/default_avatar.jpg',
  },
  {
    id: 'avatar_2',
    name: 'Brunette Girl',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_3',
    name: 'Ponytail Elegance',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_4',
    name: 'Wavy Dark Hair Boy',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_5',
    name: 'Vintage Tweed Cap',
    url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_6',
    name: 'Handsome Youth',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_7',
    name: 'Midnight Cyber Girl',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_8',
    name: 'Silver Hair Boy',
    url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_9',
    name: '3D Goggles Steampunk',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SteampunkGogglesRedhead&backgroundColor=27223b',
  },
  {
    id: 'avatar_10',
    name: '3D Purple Hair & Cat',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PurpleHairKitty&backgroundColor=31244e',
  },
  {
    id: 'avatar_11',
    name: '3D Boss Sunglasses',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MafiaBossShades&backgroundColor=202428',
  },
  {
    id: 'avatar_12',
    name: '3D Fedora Guitarist',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FedoraJazzGuitar&backgroundColor=ecd677',
  },
  {
    id: 'avatar_13',
    name: '3D Pink Portrait Girl',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SweetPinkSmilingGirl&backgroundColor=ffd1dc',
  },
  {
    id: 'avatar_14',
    name: '3D Beanie & Glasses',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=BeanieRedGlasses&backgroundColor=b8d8d8',
  },
  {
    id: 'avatar_15',
    name: '3D Red Hoodie Boy',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FreckleBoyRedHoodie&backgroundColor=fceade',
  },
  {
    id: 'avatar_16',
    name: '3D Retro Shades Guy',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RetroMoustacheShades&backgroundColor=f2d1e0',
  },
  {
    id: 'avatar_17',
    name: '3D Viking Warrior',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VikingRedBeardHelmet&backgroundColor=7ea04d',
  },
  {
    id: 'avatar_18',
    name: '3D Smiling Buns Grandma',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CheerfulBunLady&backgroundColor=f7c59f',
  },
  {
    id: 'avatar_19',
    name: '3D Curly Afro Star',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CurlyAfroElegance&backgroundColor=ffb5a7',
  },
  {
    id: 'avatar_20',
    name: '3D Anime Adventurer',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HeroAdventurerSmile&backgroundColor=dedbd2',
  },
];

export const DEFAULT_AVATAR_URL = AVATARS_LIST[0].url;
