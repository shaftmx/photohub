/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    themes: {
      light: {
        colors: {
          // Primary/secondary: used in the logo, for headlines, for buttons (if dask enough) and as background
          // accent: use for buttons or section that need to stand out
          // Neutral: great for background

          // Default
          // primary: '#1867C0',
          // secondary: '#5CBBF6',

          primary: '#673AB7',
          secondary: '#3F51B5',
          accent: '#11cdef',
          //accent: '#5e72e4',
          accent2: '#2dce89',
          neutral: '#CFD8DC',
          neutral2: '#ECEFF1',

          success: '#4CAF50',
          error: '#af4c58',
          // error: '#c22f4c',
          // error: '#f5365c',
          //warning: '#fb6340',
          // success: '#2dce89',
        },
      },
      dark: {
        colors: {
          // Primary/secondary: used in the logo, for headlines, for buttons (if dask enough) and as background
          // accent: use for buttons or section that need to stand out
          // Neutral: great for background

          // Default
          // primary: '#1867C0',
          // secondary: '#5CBBF6',

          primary: '#673AB7',
          secondary: '#3F51B5',
          accent: '#11cdef',
          //accent: '#5e72e4',
          accent2: '#2dce89',
          neutral: '#3f464d',
          neutral2: '#44474a',

          success: '#4CAF50',
          error: '#af4c58',
          // error: '#c22f4c',
          // error: '#f5365c',
          //warning: '#fb6340',
          // success: '#2dce89',
        },
      },
    },
  },
})
