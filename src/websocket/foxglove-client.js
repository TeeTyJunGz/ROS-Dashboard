import { FoxgloveClient } from '@foxglove/ws-protocol'
import { MessageReader, MessageWriter } from '@foxglove/rosmsg2-serialization'
import { parse } from '@foxglove/rosmsg'

const CLIENT_MESSAGE_DEFINITIONS = {
  'std_msgs/msg/String': `string data`,
  'geometry_msgs/msg/Twist': `geometry_msgs/msg/Vector3 linear
geometry_msgs/msg/Vector3 angular
================================================================================
MSG: geometry_msgs/msg/Vector3
float64 x
float64 y
float64 z`
}

/**
 * FoxgloveClientWrapper
 * Wraps FoxgloveClient to provide a WebSocket-like API for the dashboard
 *
 * Key Fix: subscription IDs returned by client.subscribe() are unique
 * We must store readers using subscriptionId, not channelId
 */
export default class FoxgloveClientWrapper {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.client = null
    this.ws = null
    this.messageReaders = new Map() // subscriptionId → MessageReader (KEY FIX!)
    this.channelsByTopic = new Map() // topic → {id, reader}
    this.subscriptionsByTopic = new Map() // topic → subscriptionId
    this.clientAdvertisementsByKey = new Map() // topic::type -> { id, writer, schemaName }
    this.eventHandlers = new Map()
    this.isConnectedFlag = false
  }

  /**
   * Register event handler
   * Supported events: 'open', 'advertise', 'message', 'error', 'close'
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(handler)
  }

  /**
   * Emit event to all registered handlers
   */
  emit(event, ...args) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(...args)
      } catch (error) {
        console.error(`Error in event handler for '${event}':`, error)
      }
    })
  }

  /**
   * Connect to Foxglove bridge
   */
  connect() {
    if (this.client) {
      console.warn('Foxglove client already connected or connecting')
      return
    }

    try {
      console.log('Connecting to Foxglove Bridge at:', this.wsUrl)
      this.ws = new WebSocket(this.wsUrl, [FoxgloveClient.SUPPORTED_SUBPROTOCOL])
      this.client = new FoxgloveClient({ ws: this.ws })

      this.setupEventHandlers()
    } catch (error) {
      console.error('Failed to create Foxglove connection:', error)
      this.isConnectedFlag = false
      this.emit('error', error)
    }
  }

  /**
   * Setup FoxgloveClient event handlers
   */
  setupEventHandlers() {
    // Connection opened
    this.client.on('open', () => {
      console.log('[Foxglove] Connected to Bridge at:', this.wsUrl)
      this.isConnectedFlag = true
      this.emit('open')
    })

    // Channel advertisement
    this.client.on('advertise', (channels) => {
      console.log(`[Foxglove] Advertised ${channels.length} channels`)

      channels.forEach(channel => {
        try {
          // Parse schema - handle both base64 and plain text
          let schemaText
          try {
            schemaText = atob(channel.schema)
          } catch (e) {
            schemaText = channel.schema
          }

          // Parse ROS message definition
          const messageDefinitions = parse(schemaText)

          // Store channel info for later subscription
          this.channelsByTopic.set(channel.topic, {
            id: channel.id,
            messageDefinitions
          })

          console.log(`  ✓ ${channel.topic}`)
        } catch (error) {
          console.error(`  ✗ Failed to parse schema for ${channel.topic}:`, error)
        }
      })

      // Emit advertise event with channel list
      this.emit('advertise', channels)
    })

    // Message received
    this.client.on('message', (msgEvent) => {
      try {
        // KEY FIX: Use subscriptionId to look up reader
        const reader = this.messageReaders.get(msgEvent.subscriptionId)

        if (!reader) {
          return
        }

        // Deserialize binary CDR data to JavaScript object
        const deserializedData = reader.readMessage(msgEvent.data)

        // Find topic name from subscription ID
        const topic = Array.from(this.subscriptionsByTopic.entries()).find(
          ([_, subId]) => subId === msgEvent.subscriptionId
        )?.[0]

        if (topic) {
          // Emit message in expected format
          this.emit('message', {
            topic,
            data: deserializedData,
            subscriptionId: msgEvent.subscriptionId
          })
        }
      } catch (error) {
        console.error('[Foxglove] Failed to deserialize message:', error)
      }
    })

    // Error handling
    this.client.on('error', (error) => {
      console.error('[Foxglove] Bridge error:', error)
      this.isConnectedFlag = false
      this.emit('error', error)
    })

    // Connection closed
    this.client.on('close', () => {
      console.log('[Foxglove] Connection closed')
      this.isConnectedFlag = false
      this.cleanup()
      this.emit('close')
    })
  }

  /**
   * Subscribe to a topic by name
   * KEY: Stores reader using the subscriptionId returned by client.subscribe()
   */
  subscribeToTopic(topic) {
    const channel = this.channelsByTopic.get(topic)

    if (!channel) {
      console.warn(`[Foxglove] Topic not found: ${topic}`)
      console.warn('[Foxglove] Available topics:', Array.from(this.channelsByTopic.keys()))
      return null
    }

    // Check if already subscribed
    if (this.subscriptionsByTopic.has(topic)) {
      console.log(`[Foxglove] Already subscribed to ${topic}`)
      return this.subscriptionsByTopic.get(topic)
    }

    try {
      // THE FIX IS HERE:
      // client.subscribe() returns a unique Subscription ID
      // We MUST save our reader using THIS ID, not the channel.id!
      const subId = this.client.subscribe(channel.id)

      // Create reader for this subscription
      const reader = new MessageReader(channel.messageDefinitions)

      // Store using subscriptionId (not channelId!)
      this.messageReaders.set(subId, reader)
      this.subscriptionsByTopic.set(topic, subId)

      console.log(`[Foxglove] Subscribed to ${topic} (subId: ${subId})`)
      return subId
    } catch (error) {
      console.error(`[Foxglove] Failed to subscribe to ${topic}:`, error)
      return null
    }
  }

  /**
   * Unsubscribe from a topic by name
   */
  unsubscribeFromTopic(topic) {
    const subId = this.subscriptionsByTopic.get(topic)

    if (!subId) {
      console.warn(`[Foxglove] Not subscribed to ${topic}`)
      return
    }

    try {
      this.client.unsubscribe(subId)
      this.subscriptionsByTopic.delete(topic)
      this.messageReaders.delete(subId)
      console.log(`[Foxglove] Unsubscribed from ${topic}`)
    } catch (error) {
      console.error(`[Foxglove] Failed to unsubscribe from ${topic}:`, error)
    }
  }

  /**
   * Publish a message (not yet implemented)
   */
  publishMessage(topic, messageType, data) {
    if (!this.client || !this.isConnectedFlag) {
      console.warn(`[Foxglove] Cannot publish to ${topic}: not connected`)
      return false
    }

    try {
      const schemaName = normalizeRosMessageType(messageType)
      const clientChannel = this.ensureClientAdvertisement(topic, schemaName)
      if (!clientChannel) {
        return false
      }

      const serialized = clientChannel.writer.writeMessage(data)
      this.client.sendMessage(clientChannel.id, serialized)
      return true
    } catch (error) {
      console.error(`[Foxglove] Failed to publish to ${topic}:`, error)
      return false
    }
  }

  /**
   * Get connection status
   */
  get isConnected() {
    return this.isConnectedFlag
  }

  /**
   * Cleanup on disconnect
   */
  cleanup() {
    this.messageReaders.clear()
    this.subscriptionsByTopic.clear()
    this.channelsByTopic.clear()
    this.clientAdvertisementsByKey.clear()
  }

  /**
   * Close connection
   */
  close() {
    if (this.client) {
      this.client.close()
      this.client = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnectedFlag = false
    this.cleanup()
  }

  /**
   * Get list of available topics
   */
  getTopics() {
    return Array.from(this.channelsByTopic.keys())
  }

  ensureClientAdvertisement(topic, schemaName) {
    const advertisementKey = `${topic}::${schemaName}`
    const existingChannel = this.clientAdvertisementsByKey.get(advertisementKey)
    if (existingChannel) {
      return existingChannel
    }

    const schema = CLIENT_MESSAGE_DEFINITIONS[schemaName]
    if (!schema) {
      throw new Error(`Unsupported publish message type: ${schemaName}`)
    }

    const messageDefinitions = parse(schema, { ros2: true })
    const writer = new MessageWriter(messageDefinitions)
    const channelId = this.client.advertise({
      topic,
      encoding: 'cdr',
      schemaName,
      schemaEncoding: 'ros2msg',
      schema
    })

    const advertisedChannel = {
      id: channelId,
      writer,
      schemaName
    }

    this.clientAdvertisementsByKey.set(advertisementKey, advertisedChannel)
    console.log(`[Foxglove] Advertised client channel for ${topic} (${schemaName})`)
    return advertisedChannel
  }
}

function normalizeRosMessageType(messageType) {
  if (!messageType) {
    throw new Error('Message type is required for publishing')
  }

  if (messageType.includes('/msg/')) {
    return messageType
  }

  const parts = messageType.split('/').filter(Boolean)
  if (parts.length === 2) {
    return `${parts[0]}/msg/${parts[1]}`
  }

  return messageType
}
