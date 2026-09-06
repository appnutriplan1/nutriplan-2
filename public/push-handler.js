self.addEventListener('push', function (event) {
  var data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = {} }
  var title = data.title || 'NutriPlan'
  var options = {
    body: data.body || 'Tienes una novedad de tu nutricionista.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'nutriplan',
    data: { url: data.url || '/home' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var target = new URL((event.notification.data && event.notification.data.url) || '/home', self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
    for (var i = 0; i < clients.length; i += 1) {
      if ('focus' in clients[i]) {
        clients[i].navigate(target)
        return clients[i].focus()
      }
    }
    return self.clients.openWindow ? self.clients.openWindow(target) : undefined
  }))
})
