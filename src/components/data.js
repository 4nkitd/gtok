const fallbackRepos = [
  {
    id: 10270250,
    name: 'react',
    username: 'facebook',
    description: 'The library for web and native user interfaces.',
    stars: '228k',
    starsCount: 228000,
    forks: '46k',
    forksCount: 46000,
    language: 'JavaScript',
    profile: 'https://avatars.githubusercontent.com/u/69631?v=4',
    url: 'https://github.com/facebook/react'
  },
  {
    id: 70107786,
    name: 'next.js',
    username: 'vercel',
    description: 'The React Framework for the Web.',
    stars: '127k',
    starsCount: 127000,
    forks: '26k',
    forksCount: 26000,
    language: 'JavaScript',
    profile: 'https://avatars.githubusercontent.com/u/14985020?v=4',
    url: 'https://github.com/vercel/next.js'
  },
  {
    id: 2325298,
    name: 'linux',
    username: 'torvalds',
    description: 'Linux kernel source tree.',
    stars: '179k',
    starsCount: 179000,
    forks: '54k',
    forksCount: 54000,
    language: 'C',
    profile: 'https://avatars.githubusercontent.com/u/1024025?v=4',
    url: 'https://github.com/torvalds/linux'
  },
  {
    id: 106283893,
    name: 'tailwindcss',
    username: 'tailwindlabs',
    description: 'A utility-first CSS framework for rapid UI development.',
    stars: '83k',
    starsCount: 83000,
    forks: '4.2k',
    forksCount: 4200,
    language: 'TypeScript',
    profile: 'https://avatars.githubusercontent.com/u/67109815?v=4',
    url: 'https://github.com/tailwindlabs/tailwindcss'
  },
  {
    id: 23096959,
    name: 'go',
    username: 'golang',
    description: 'The Go programming language',
    stars: '124k',
    starsCount: 124000,
    forks: '17k',
    forksCount: 17000,
    language: 'Go',
    profile: 'https://avatars.githubusercontent.com/u/4314092?v=4',
    url: 'https://github.com/golang/go'
  },
  {
    id: 54346799,
    name: 'rust',
    username: 'rust-lang',
    description: 'Empowering everyone to build reliable and efficient software.',
    stars: '98k',
    starsCount: 98000,
    forks: '13k',
    forksCount: 13000,
    language: 'Rust',
    profile: 'https://avatars.githubusercontent.com/u/5430905?v=4',
    url: 'https://github.com/rust-lang/rust'
  },
  {
    id: 11730342,
    name: 'vue',
    username: 'vuejs',
    description: 'Vue.js is a progressive, incrementally-adoptable JavaScript framework for building UI on the web.',
    stars: '208k',
    starsCount: 208000,
    forks: '33k',
    forksCount: 33000,
    language: 'TypeScript',
    profile: 'https://avatars.githubusercontent.com/u/6128107?v=4',
    url: 'https://github.com/vuejs/vue'
  }
];

export const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'm';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

export const formatRepo = (item) => ({
  id: item.id,
  name: item.name,
  username: item.owner ? item.owner.login : 'unknown',
  description: item.description || 'No description provided.',
  stars: formatNumber(item.stargazers_count),
  starsCount: item.stargazers_count || 0,
  forks: formatNumber(item.forks_count),
  forksCount: item.forks_count || 0,
  language: item.language || 'Code',
  profile: item.owner ? item.owner.avatar_url : 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
  url: item.html_url
});

export default fallbackRepos;
