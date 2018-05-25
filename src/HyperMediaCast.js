import { EventEmitter } from 'events'
import Bonjour from 'bonjour'
import { Client, DefaultMediaReceiver } from 'castv2-client'

const bonjour = Bonjour()

export class HyperMediaCast extends EventEmitter {
  constructor () {
    super()
    this.devices = []
    this.lastStatus = {}
    this.currentDevice = null
    this.browser = bonjour.find({ type: 'googlecast' })
    this.browser.on('up', service => {
      if (!this.devices.find(x => x.host === service.host)) {
        var client = new Client()
        client.connect(service.addresses[0], () => {
          client.getStatus((err, status) => {
            client.on('status', status => {
              var index = this.devices.findIndex(x => x.host === service.host)
              if (this.validateCast(status) && index < 0) {
                this.pushCast(client, status.applications[0], service.host)
              }

              if (!this.validateCast(status) && index >= 0) {
                var device = this.devices[index]
                device.media.removeAllListeners()
                this.devices.splice(index, 1)
                if (device === this.currentDevice) {
                  this.setCurrentDevice(this.devices[0])
                  this.emit('status', this.lastStatus = { isRunning: false })
                }
              }
            })

            if (err || !this.validateCast(status)) return

            this.pushCast(client, status.applications[0], service.host)
          })
        })
      }
    })
    this.browser.on('down', service => {
      var index = this.devices.findIndex(x => x.host === service.host)
      if (index >= 0) {
        var device = this.devices[index]
        device.media.removeAllListeners()
        this.devices.splice(index, 1)
        if (device === this.currentDevice) {
          this.setCurrentDevice(this.devices[0])
          this.emit('status', this.lastStatus = { isRunning: false })
        }
      }
    })
  }

  playerName () {
    return 'cast'
  }

  iconUrl () {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAk6QAAJOkBUCTn+AAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAOPSURBVHic7dpLiB1FFMbxnzPKxFdcaAyGIKKEAcUIosEB0aiEgODOiBF1owvJQjeiGxF1I8GN4koxiGBA40ZdiIoSo6JZ6Cq+gi4UNEYQHzMxDw0ZFzWN7U1VT/e9fW/Po/5QzJ3qU3VOfXTX43STyWQymUwm8x+n4C58hEOYXeTlEPbgjrmxVXIqdi2AoIdVdmK8SoDHF0CQwy6PlAdcviXOwC84q0qhJcA0VuMojJUuXG3pDx5WCmNFeOYLzks0uG2o4QyfXZG684sfZQHGIobwWqvhLAzGTvqxXMkCdB1A12QBug6ga5a9AOVl8FOLf83PRIidB7YUF5f9I5AF6DqArilPgmtxOf7Cn/h+7u+SpizAlJNPTgfxlZAe2429ODaa0EbPFvNnU/7AC7hOjfzaAqHVVeAc3CMkGffhbv+/ixYdg0yCl+ElfIHN7YQzetpYBSbxtjB/rG6hv045E6uwHrfiUbyHw+plXH/GjSOPuprKOaAuKwRB3sQ/iU6LchwPtRB4W7QiQJmL8ZywHFYJ8bSFsdFqXYCCSeHxqBJhh+6Xy6EJUHAfjiQczWJ7m876oLYA1+BFPIv7cZPwtqgOV+CHhLNZQaSuqC1AbCd4DO/gTkzM42itsCeIOTyKKwcbR98MJEC5/IQHcFqFs1XYn2j/rbDMjprWBCjKPlxV4fAiHEi07WI+aF2A4tHYVuF0o7Af6G33Ny4dbDyNqS3AlHDI+Vr1rF4uT1Y4Tn1r8PqAA2pKX8vgCtyM54UESZUIjyX6mMA3EfsTQuJlVAy8D1gjCBG7pYuyNdF2c8L+5YaDGISBBSjYhN8SHU7jkkS7TyL2R4TcwihoTQBYJ+QKY52+lWhzS8L+3n6DaEirAhB2fTOJjjdF7MeFPUSv7buDBNGARsvgQSEB+qDqW/T2RMe7E/ZPRWwPm3932QZ97wN+Vf2ucE+i83UR2+sTthsbDqYfKgWoSmiei1dwAZ6JXH9YeKHay1Y80VO3V5j4Tu+p34APIn1MCWeLYXEiVpnaCR7HDYmOvozYf5iw/ThiuyNhO+yvVa8tHNXJ2IxLZ3feiNRtEL+z9kfqJmv4b5tpfFb8UzdltV7IF/TyfqRuQjgQ9fJdpG5NTf9tst3cV6I0y9nFlrgfE7ax5/f3SN3ZDfy3wU49J9Imb3UujNQdSNiujNTNROpGIcAMPhcSua8Kc0Amk8lkMpmMfwGDu17XcpATwQAAAABJRU5ErkJggg=='
  }

  changeLibrary () {
    var index = this.devices.findIndex(x => x.host === this.currentDevice.host)
    this.setCurrentDevice(this.devices[++index % this.devices.length])
  }

  playPause () {
    if (!this.currentDevice) return Promise.resolve({ isRunning: false })

    if (this.lastStatus.state === 'playing') {
      return new Promise((resolve, reject) => {
        this.currentDevice.media.pause(() => resolve(this.lastStatus))
      })
    } else {
      return new Promise((resolve, reject) => {
        this.currentDevice.media.play(() => resolve(this.lastStatus))
      })
    }
  }

  activate () {
  }

  deactivate () {
  }

  setCurrentDevice (device) {
    this.currentDevice = device
    this.forceUpdate()
  }

  composeStatus (status) {
    if (!status) return { isRunning: false }
    return {
      isRunning: true,
      state: status.playerState.toLowerCase(),
      itemId: status.currentItemId,
      track: (status.media && {
        name: status.media.metadata.title,
        artist: status.media.metadata.artist,
        coverUrl: status.media.metadata.images && (status.media.metadata.images.length > 0) && status.media.metadata.images[0].url,
        duration: status.media.duration * 1000
      }) || {}
    }
  }

  validateCast (status) {
    return status.applications && status.applications.filter(x => x.namespaces.filter(y => y.name === 'urn:x-cast:com.google.cast.media').length > 0).length > 0
  }

  pushCast (client, application, host) {
    client.join(application, DefaultMediaReceiver, (err, app) => {
      if (err) return
      var device = { host: host, media: app }
      this.devices.push(device)
      device.media.on('status', status => {
        if (this.currentDevice === device) {
          if (status.playerState === 'PLAYING') {
            this.forceUpdate()
          } else {
            this.emit('status', this.lastStatus = Object.assign(this.lastStatus, { state: status.playerState.toLowerCase() }))
          }
        }
      })
      if (this.devices.length === 1) this.setCurrentDevice(device)
    })
  }

  forceUpdate () {
    if (!this.currentDevice) {
      this.emit('status', this.lastStatus = { isRunning: false })
      return
    }

    this.currentDevice.media.getStatus((err, status) => {
      if (err) {
        var index = this.devices.findIndex(x => x.host === this.currentDevice.host)
        if (index >= 0) {
          this.devices[index].media.removeAllListeners()
          this.devices.splice(index, 1)
          this.setCurrentDevice(this.devices[0])
        }
        this.emit('status', this.lastStatus = { isRunning: false })
        return
      }
      this.emit('status', this.lastStatus = this.composeStatus(status))
    })
  }
}
