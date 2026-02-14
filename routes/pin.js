import express from 'express'
import https from 'https'

var router = express.Router()

var getInitialAuth = () => {
  return new Promise((resolve, reject) => {
    var options = {
      hostname: 'id.pinterest.com',
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }

    https.get(options, res => {
      var cookies = res.headers['set-cookie']

      if (cookies) {
        var csrfCookie = cookies.find(c => c.startsWith('csrftoken='))
        var sessCookie = cookies.find(c => c.startsWith('_pinterest_sess='))

        if (csrfCookie && sessCookie) {
          var csrftoken = csrfCookie.split(';')[0].split('=')[1]
          var sess = sessCookie.split(';')[0]

          resolve({
            csrftoken: csrftoken,
            cookieHeader: `csrftoken=${csrftoken}; ${sess}`
          })
          return
        }
      }
      reject(new Error('Failed to get auth cookies'))
    }).on('error', e => reject(e))
  })
}

var searchPinterestAPI = async (query, limit) => {
  try {
    var auth = await getInitialAuth()
    var csrftoken = auth.csrftoken
    var cookieHeader = auth.cookieHeader

    var results = []
    var bookmark = null
    var keepFetching = true

    while (keepFetching && results.length < limit) {

      var postData = {
        options: {
          query: query,
          scope: 'pins',
          bookmarks: bookmark ? [bookmark] : []
        },
        context: {}
      }

      var sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`
      var dataString =
        `source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(JSON.stringify(postData))}`

      var options = {
        hostname: 'id.pinterest.com',
        path: '/resource/BaseSearchResource/get/',
        method: 'POST',
        headers: {
          Accept: 'application/json, text/javascript, */*, q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrftoken,
          'X-Pinterest-Source-Url': sourceUrl,
          Cookie: cookieHeader
        }
      }

      var responseBody = await new Promise((resolve, reject) => {
        var req = https.request(options, res => {
          var body = ''

          res.on('data', chunk => body += chunk)
          res.on('end', () => resolve(body))
        })

        req.on('error', e => reject(e))
        req.write(dataString)
        req.end()
      })

      var jsonResponse = JSON.parse(responseBody)

      if (
        jsonResponse.resource_response &&
        jsonResponse.resource_response.data &&
        jsonResponse.resource_response.data.results
      ) {

        var pins = jsonResponse.resource_response.data.results

        pins.forEach(pin => {
          if (pin.images && pin.images['736x']) {
            results.push(pin.images['736x'].url)
          } else if (pin.images && pin.images['orig']) {
            results.push(pin.images['orig'].url)
          }
        })

        bookmark = jsonResponse.resource_response.bookmark
        if (!bookmark || pins.length === 0) keepFetching = false

      } else {
        keepFetching = false
      }
    }

    return results.slice(0, limit)
  } catch (e) {
    throw new Error(e.message)
  }
}

router.get('/pin-search', async (req, res) => {
  try {
    var q = req.query.q
    var limit = req.query.limit ? parseInt(req.query.limit) : 5

    if (!q) {
      return res.status(400).json({
        status: false,
        message: 'Query is required',
        example: '/api/pin-search?q=car&limit=5'
      })
    }

    var images = await searchPinterestAPI(q, limit)

    res.json({
      status: true,
      creator: "Akshay-Eypz",
      query: q,
      total: images.length,
      result: images
    })

  } catch (e) {
    res.status(500).json({
      status: false,
      error: e.message
    })
  }
})

export default router
