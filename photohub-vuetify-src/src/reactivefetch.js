// From https://vuejs.org/guide/reusability/composables.html#accepting-reactive-state

// This is the same as fetch, but if the url provided change, it will automatically trigger a re-fetch
// Could be use for example:
// const { data, error } = useFetch(() => `/posts/${props.id}`)

// Basically you display a specific post. You click on a button to switch current to the next post id.
// And reactiveFetch will automatically fetch the new post datas

// I decided to use this in the code as it's more flexible. But I don't know about potential performances issues due to watch callbacks

import { ref, watchEffect, toValue } from 'vue'

// export function usePost(url, body) {
//   const data = ref(null)
//   const error = ref(null)

//   fetch(url,{
//     method:  'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'X-CSRFToken': getCookie("csrftoken"),
//     },
//     body: JSON.stringify(body)
//   })
//     .then(res => res.json())
//     .then((json) => {
//         data.value = json
//         console.log("+ post " + url)
//         // Debug
//         // console.log(json)

//     })
//     .catch((err) => (error.value = err))
//     // .finally(() => { return { data, error }} )
//   return { data, error }
// }

export async function useAsyncUploadFile(url, body) {
  const data = ref(null)
  const error = ref(null)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        //'Content-Type': 'multipart/form-data', // https://github.com/axios/axios/issues/4576#issuecomment-1321289211
        'X-CSRFToken': getCookie("csrftoken"),
      },
      body: body
    })
    data.value = await res.json()
    console.log("+ post " + url)
  } catch (e) {
    error.value = await e
    // console.log(e)
    return { data, error }
  }
  return { data, error }
}

export async function useAsyncPost(url, body) {
  const data = ref(null)
  const error = ref(null)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie("csrftoken"),
      },
      body: JSON.stringify(body)
    })
    data.value = await res.json()
    console.log("+ post " + url)
  } catch (e) {
    error.value = await e
    // console.log(e)
    return { data, error }
  }
  return { data, error }
}


export async function useAsyncFetch(url, body) {
  const data = ref(null)
  const error = ref(null)

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    data.value = await res.json()
    console.log("+ get " + url)
  } catch (e) {
    error.value = await e
    // console.log(e)
    return { data, error }
  }

  return { data, error }
}



// Quite a fail to do it aynsc, putting this in comment for now
// export async function useReactiveFetch(url) {
//   const data = await ref(null)
//   const error = await ref(null)

//   const fetchData = async () => {
//     // reset state before fetching..
//     data.value = null
//     error.value = null

//     try {
//       const res = await fetch(url, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//         }})
//       data.value = await res.json()
//       console.log("+ fetched " + url)
//     } catch (e) {
//       error.value = await e
//       console.log(e)
//     }
//   }

//   watchEffect(async () => {
//     await fetchData()
//   })

//   // This does not seems to work, it trigger 2 time the request
//   // Enforce and  wait initial and first fetch. Then the others fetch will be triggered by watchEffect
//   // await fetchData()
//   return { data, error }
// }

// export function useReactiveFetch(url) {
//   const data = ref(null)
//   const error = ref(null)

//   const fetchData = () => {
//     // reset state before fetching..
//     data.value = null
//     error.value = null

//     fetch(toValue(url))
//       .then((res) => res.json())
//       .then((json) => {
//         data.value = json
//         console.log("+ fetched " + url)
//         // Debug
//         // console.log(json)
//       })
//       .catch((err) => (error.value = err))
//   }

//   watchEffect(() => {
//     fetchData()
//   })

//   return { data, error }
// }


// from https://www.w3schools.com/js/js_cookies.asp
function getCookie(cname) {
  let name = cname + "=";
  let ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// Backup
// export function useReactiveFetch(url) {
//   const data = ref(null)
//   const error = ref(null)
// 
//   const fetchData = () => {
//     // reset state before fetching..
//     data.value = null
//     error.value = null
// 
//     fetch(toValue(url))
//       .then((res) => res.json())
//       .then((json) => (data.value = json))
//       .catch((err) => (error.value = err))
//   }
// 
//   watchEffect(() => {
//     fetchData()
//   })
// 
//   return { data, error }
// }



// fetch( 'https://api.roastandbrew.coffee/api/v1/brew-methods', {
//     method: 'POST',
//     headers: {
//         'Authorization': 'Bearer '+this.token,
//         'Accept': 'application/json',
//         'Content-Type': 'application/json;charset=utf-8'
//     },
//     body: JSON.stringify( this.form )
// } )
// .then( function( response ){
//     if( response.status != 201 ){
//         this.fetchError = response.status;
//     }else{
//         response.json().then( function( data ){
//             this.fetchResponse = data;
//         }.bind(this));
//     }
// }.bind(this));



// created() {
//   // POST request using fetch with error handling
//   const requestOptions = {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ title: 'Vue POST Request Example' })
//   };
//   fetch('https://jsonplaceholder.typicode.com/invalid-url', requestOptions)
//     .then(async response => {
//       const data = await response.json();
// 
//       // check for error response
//       if (!response.ok) {
//         // get error message from body or default to response status
//         const error = (data && data.message) || response.status;
//         return Promise.reject(error);
//       }
// 
//       this.postId = data.id;
//     })
//     .catch(error => {
//       this.errorMessage = error;
//       console.error('There was an error!', error);
//     });
// }


// Async version
// async created() {
//   // POST request using fetch with async/await
//   const requestOptions = {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ title: "Vue POST Request Example" })
//   };
//   const response = await fetch("https://jsonplaceholder.typicode.com/posts", requestOptions);
//   const data = await response.json();
//   this.postId = data.id;
// }
