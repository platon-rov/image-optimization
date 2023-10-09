/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import image_2x_avif from './image-2x.avif'
import image_1x_avif from './image-1x.avif'
import image_2x_webp from './image-2x.webp'
import image_1x_webp from './image-1x.webp'
import image_2x_jpeg from './image-2x.jpeg'
import image_1x_jpeg from './image-1x.jpeg'

import { preloadImages } from '../preload-images'

export const config = [
{
  media: '',
  srcSet: `${image_2x_avif} 2x, ${image_1x_avif} 1x`,
  type: 'image/avif',
  width: 500,
  height: 333,
},
{
  media: '',
  srcSet: `${image_2x_webp} 2x, ${image_1x_webp} 1x`,
  type: 'image/webp',
  width: 500,
  height: 333,
},
{
  media: '',
  srcSet: `${image_2x_jpeg} 2x, ${image_1x_jpeg} 1x`,
  type: 'image/jpeg',
  width: 500,
  height: 333,
}
]

export const fallbackImageUrl = image_2x_jpeg

preloadImages(config)