import { registerSubPlugin } from 'hyper-plugin-extend'
import { HyperMediaCast } from './HyperMediaCast'

export const onRendererWindow = registerSubPlugin('hyper-media-control', HyperMediaCast)
