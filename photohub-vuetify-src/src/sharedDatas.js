
export  function getSharedDatas(app) {
  console.log('Is Mobile:', app.$vuetify.display.mobile);

  let data = {}
  // Used to generate potential different display on mobile phone
  data.isMobile = app.$vuetify.display.mobile

  // Set default values

  // --- Photo gallery
  // Sample size to use for gallery view
  data.gridPhotoSize = "s"
  // Default size for photos in the grid
  data.gridSize = 350
  // Min and Max size for photos in the grid a user can select in the selector for
  data.gridMin = 100
  data.gridMax = 600
  // Margin size between picture in the grid (to space them)
  data.gridMargin = "2px"

  // --- Display photo full size
  // Size of the sample of picture to open for full size display
  data.displayPhotoSize = "l"

  //
  // Override in case of mobile
  //
  if (data.isMobile) {
    // --- Photo gallery
    data.gridPhotoSize = "xs"
    data.gridSize = 60
    data.gridMin = 40
    data.gridMax = 120
    data.gridMargin = "1px"

    // --- Display photo full size
    data.displayPhotoSize = "m"

  }

  return data
}