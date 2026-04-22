import { useAppConfigStore } from './stores/appConfig.js'

export function getSharedDatas(app) {
  const cfg = useAppConfigStore()
  const isMobile = app.$vuetify.display.mobile

  const data = {
    isMobile,
    gridSize:        isMobile ? cfg.gridSizeMobile  : cfg.gridSize,
    gridMin:         isMobile ? cfg.gridMinMobile   : cfg.gridMin,
    gridMax:         isMobile ? cfg.gridMaxMobile   : cfg.gridMax,
    gridMargin:      isMobile ? '1px' : '2px',
    displayPhotoSize: isMobile ? cfg.displayPhotoSizeMobile : cfg.displayPhotoSize,
  }

  return data
}
