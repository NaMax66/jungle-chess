// Winter scenery is a fictional setting; mechanics stay in terrain-guide.js.
export default {
  id: 'winter',
  name: 'Зимняя',
  animals: Object.fromEntries(['rat','cat','dog','wolf','leopard','tiger','lion','elephant'].map(id => [id, `/assets/themes/winter/${id}-snow-v1.png`])),
  // Image size is selected by terrain-art.js; large art loads only in a card.
  artwork: {
    den: '/assets/themes/winter/den-v2',
    trap: '/assets/themes/winter/trap-v2'
  },
  terrain: {
    river: {title: 'Река среди снегов', text: 'По голубой воде плывут льдинки, а на берегах лежит снег. Река не замёрзла: крыса по-прежнему плавает, а лев и тигр могут перепрыгнуть на другой берег.'},
    trap: {title: 'Капкан на снегу', text: 'Раскрытый металлический капкан с зубчатыми дугами и круглой пластиной посередине отмечает опасную клетку. Вражеский зверь, попавший в ловушку, временно теряет силу — так же, как в обычной теме.'},
    den: {title: 'Пещера под снегом', text: 'За заснеженным каменным входом прячется тёмная пещера — зимнее логово зверей. Береги свою пещеру: если в неё войдёт зверь соперника, он победит.'}
  }
};
