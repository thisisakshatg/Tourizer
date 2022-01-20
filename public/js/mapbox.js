export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoib2xpdmVyLXF1ZWVuIiwiYSI6ImNreWN0Y2JlbDBzbjgydm4wOHY0ZXVidzIifQ.BTfUei4n38aK9SSxMZNBBA';

  const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/oliver-queen/ckye61vrc13nc14sau64g4c7l',
    scrollZoom: false
    // center: [-118.113491, 34.111745], // starting position [lng, lat]
    // zoom: 9 // starting zoom
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add Marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extends mapbounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
