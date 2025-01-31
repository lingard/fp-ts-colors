/**
 * @since 0.1.0
 */
import * as Ord from 'fp-ts/Ord'
import * as Equals from 'fp-ts/Eq'
import * as Sh from 'fp-ts/Show'
import * as O from 'fp-ts/Option'
import * as number from 'fp-ts/number'
import { sequenceT } from 'fp-ts/Apply'
import { absurd, flow, pipe } from 'fp-ts/function'
import { Endomorphism } from 'fp-ts/Endomorphism'

import * as HSLA from './HSLA'
import * as HSVA from './HSVA'
import * as RGBA from './RGBA'
import * as XYZ from './XYZ'
import * as Lab from './Lab'
import * as LCh from './LCh'
import * as Int from './Int'
import { square } from './math'

/**
 * @category model
 * @since 0.1.0
 */
export type ColorSpace = 'RGB' | 'HSL' | 'LCh' | 'Lab'

/**
 *  Colors are represented by their HSL values (hue, saturation, lightness) internally,
 *  as this provides more flexibility than storing RGB values.
 *
 * @category model
 * @since 0.1.0
 */
export type Color = HSLA.HSLA

/**
 * Create a `Color` from Hue, Saturation, Lightness and Alpha values. The
 * Hue is given in degrees, as a `Number` between 0.0 and 360.0. Saturation,
 * Lightness and Alpha are numbers between 0.0 and 1.0.
 *
 * @category constructors
 * @since 0.1.0
 */
export const hsla: (h: number, s: number, l: number, a: number) => Color =
  HSLA.hsla

/**
 * Create a `Color` from Hue, Saturation, Lightness and Alpha values. The
 * Hue is given in degrees, as a `Number` between 0.0 and 360.0. Saturation,
 * Lightness and Alpha are numbers between 0.0 and 1.0.
 *
 * @category constructors
 * @since 0.1.0
 */
export const hsl = (h: number, s: number, l: number): Color => hsla(h, s, l, 1)

/**
 * Create a `Color` from integer RGB values between 0 and 255 and a floating
 * point alpha value between 0.0 and 1.0.
 *
 * RGB to HSL conversion algorithm adapted from
 * https://en.wikipedia.org/wiki/HSL_and_HSV
 *
 * @category constructors
 * @since 0.1.0
 */
export const rgba: (r: number, g: number, b: number, a: number) => Color = flow(
  RGBA.rgba,
  HSLA.fromRGBA
)

/**
 * Create a `Color` from integer RGB values between 0 and 255.
 *
 * @category constructors
 * @since 0.1.0
 */
export const rgb = (r: number, g: number, b: number): Color => rgba(r, g, b, 1)

/**
 * Create a `Color` from RGB and alpha values between 0.0 and 1.0.
 *
 * @category constructors
 * @since 0.1.0
 */
export const rgba2 = (r: number, g: number, b: number, a: number): Color =>
  rgba(
    RGBA.denormalizeChannel(r),
    RGBA.denormalizeChannel(g),
    RGBA.denormalizeChannel(b),
    a
  )

/**
 * Create a `Color` from RGB values between 0.0 and 1.0.
 *
 * @category constructors
 * @since 0.1.0
 */
export const rgb2 = (r: number, g: number, b: number): Color =>
  rgba2(r, g, b, 1)

/**
 * Create a `Color` from Hue, Saturation, Value and Alpha values. The
 * Hue is given in degrees, as a `Number` between 0.0 and 360.0. Saturation,
 * Value and Alpha are numbers between 0.0 and 1.0.
 *
 * @category constructors
 * @since 0.1.0
 */
export const hsva: (h: number, s: number, v: number, a: number) => Color = flow(
  HSVA.hsva,
  HSLA.fromHSVA
)

/**
 * Create a `Color` from Hue, Saturation and Value values. The Hue is
 * given in degrees, as a `Number` between 0.0 and 360.0. Both Saturation and
 * Value are numbers between 0.0 and 1.0.
 *
 * @category constructors
 * @since 0.1.0
 */
export const hsv = (h: number, s: number, v: number): Color => hsva(h, s, v, 1)

/**
 * Create a `Color` from XYZ coordinates in the CIE 1931 color space. Note
 * that a `Color` always represents a color in the sRGB gamut (colors that
 * can be represented on a typical computer screen) while the XYZ color space
 * is bigger. This function will tend to create fully saturated colors at the
 * edge of the sRGB gamut if the coordinates lie outside the sRGB range.
 *
 * See:
 * - https://en.wikipedia.org/wiki/CIE_1931_color_space
 * - https://en.wikipedia.org/wiki/SRGB
 *
 * @category constructors
 * @since 0.1.0
 */
export const xyz: (x: number, y: number, z: number) => Color = flow(
  XYZ.xyz,
  HSLA.fromXYZ
)

/**
 * Create a `Color` from L, a and b coordinates in the Lab color space.
 * Note: See documentation for `xyz`. The same restrictions apply here.
 *
 * See: https://en.wikipedia.org/wiki/Lab_color_space
 *
 * @category constructors
 * @since 0.1.0
 */
export const lab: (l: number, a: number, b: number) => Color = flow(
  Lab.lab,
  HSLA.fromLab
)

/**
 * Create a `Color` from lightness, chroma and hue coordinates in the CIE LCh
 * color space. This is a cylindrical transform of the Lab color space.
 * Note: See documentation for `xyz`. The same restrictions apply here.
 *
 * See: https://en.wikipedia.org/wiki/Lab_color_space
 *
 * @category constructors
 * @since 0.1.0
 */
export const lch: (l: number, c: number, h: number) => Color = flow(
  LCh.lch,
  HSLA.fromLCh
)

const strMatch = (pattern: RegExp) => (str: string) =>
  O.fromNullable(str.match(pattern))

/**
 * Parse a hexadecimal RGB code of the form `#rgb` or `#rrggbb`. The `#`
 * character is required. Each hexadecimal digit is of the form `[0-9a-fA-F]`
 * (case insensitive). Returns `Option.none` if the string is in a wrong format.
 *
 * @category constructors
 * @since 0.1.0
 */
export const fromHexString: (hex: string) => O.Option<Color> = (str) => {
  const isShort = str.length == 4
  const digit = '[0-9a-fA-F]'
  const single = `(${digit})`
  const pair = `(${digit}${digit})`
  const variant = isShort
    ? `${single}${single}${single}`
    : `${pair}${pair}${pair}`
  const mPattern = `^#(?:${variant})$`
  const parseHex = Int.fromStringAs(Int.hexadecimal)

  return pipe(
    str,
    strMatch(new RegExp(mPattern)),
    O.chain((groups) =>
      sequenceT(O.Applicative)(
        parseHex(groups[1]),
        parseHex(groups[2]),
        parseHex(groups[3])
      )
    ),
    O.map(([r, g, b]) => {
      if (isShort) {
        return rgb(16 * r + r, 16 * g + g, 16 * b + b)
      }

      return rgb(r, g, b)
    })
  )
}

const clampInt = Ord.clamp(number.Ord)(0, 0xffffff)

/**
 * Converts an integer to a color (RGB representation). `0` is black and
 * `0xffffff` is white. Values outside this range will be clamped.
 *
 * This function is useful if you want to hard-code Hex values. For example:
 *
 * @example
 *
 * import * as C from 'ts-colors/Color'
 *
 * C.fromInt(0xff0000)
 *
 * @category constructors
 * @since 0.1.0
 */
export const fromInt = (i: number): Color => {
  const n = clampInt(i)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff

  return rgb(r, g, b)
}

/**
 * Pure black.
 *
 * @category constructors
 * @since 0.1.0
 */
export const black = hsl(0.0, 0.0, 0.0)

/**
 * Pure white.
 *
 * @category constructors
 * @since 0.1.0
 */
export const white = hsl(0.0, 0.0, 1.0)

/**
 * Create a gray tone from a lightness values (0.0 is black, 1.0 is white).
 *
 * @category constructors
 * @since 0.1.0
 */
export const graytone = (l: number): Color => hsl(0.0, 0.0, l)

/**
 * Get the color hue in the interval [0, 360].
 *
 * @since 0.1.4
 * @category destructors
 */
export const hue: (c: Color) => number = ({ h }) => h

/**
 * Convert a `Color` to its red, green, blue and alpha values. The RGB values
 * are integers in the range from 0 to 255. The alpha channel is a number
 * between 0.0 and 1.0.
 *
 * @since 0.1.0
 * @category destructors
 */
export const toRGBA: (c: Color) => RGBA.RGBA = RGBA.fromHSLA

/**
 * Convert a `Color` to its Hue, Saturation, Lightness and Alpha values. See
 * `hsla` for the ranges of each channel.
 *
 * @since 0.1.0
 * @category destructors
 */
export const toHSLA: (c: Color) => HSLA.HSLA = (c) => c

/**
 * Convert a `Color` to its Hue, Saturation, Value and Alpha values. See
 * `hsva` for the ranges of each channel.
 *
 * @since 0.1.0
 * @category destructors
 */
export const toHSVA: (c: Color) => HSVA.HSVA = HSVA.fromHSLA

/**
 * Get XYZ coordinates according to the CIE 1931 color space.
 *
 * See:
 * - https://en.wikipedia.org/wiki/CIE_1931_color_space
 * - https://en.wikipedia.org/wiki/SRGB
 *
 * @since 0.1.0
 * @category destructors
 */
export const toXYZ: (c: Color) => XYZ.XYZ = XYZ.fromHSLA

/**
 * Get L, a and b coordinates according to the Lab color space.
 *
 * See: https://en.wikipedia.org/wiki/Lab_color_space
 *
 * @since 0.1.0
 * @category destructors
 */
export const toLab: (c: Color) => Lab.Lab = Lab.fromHSLA

/**
 * Get L, C and h coordinates according to the CIE LCh color space.
 * See: https://en.wikipedia.org/wiki/Lab_color_space
 *
 * @since 0.1.0
 * @category destructors
 */
export const toLCh: (c: Color) => LCh.LCh = LCh.fromHSLA

const hexToString = Int.toStringAs(Int.hexadecimal)

/**
 * @since 0.1.0
 * @category destructors
 */
export const toHexString: (c: Color) => string = (color) => {
  const c = toRGBA(color)
  const toHex = (n: number) => {
    const repr = hexToString(n)

    if (repr.length === 1) {
      return `0${repr}`
    }

    return repr
  }

  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`
}

/**
 * A CSS representation of the color
 *
 * @since 0.1.5
 * @category destructors
 */
export const toCSS: (s: ColorSpace) => (c: Color) => string = (s) => (c) => {
  switch (s) {
    case 'HSL': {
      return HSLA.toCSS(c)
    }

    case 'Lab':
    case 'LCh':
    case 'RGB': {
      return pipe(RGBA.fromHSLA(c), RGBA.toCSS)
    }

    default: {
      return absurd(s)
    }
  }
}

/**
 * A CSS representation of the color in the form `hsl(..)` or `hsla(...)`.
 *
 * @since 0.1.5
 * @category destructors
 */
export const toHSLAString: (c: Color) => string = toCSS('HSL')

/**
 * Use [toHSLAString](#toHSLAString) instead
 *
 * @since 0.1.0
 * @category destructors
 * @deprecated
 */
export const cssStringHSLA: (c: Color) => string = toHSLAString

/**
 * A CSS representation of the color in the form `rgb(..)` or `rgba(...)`
 *
 * @since 0.1.5
 * @category destructors
 */
export const toRGBAString = toCSS('RGB')

/**
 * Use [toRGBAString](#toRGBAString) instead
 *
 * @since 0.1.0
 * @category destructors
 * @deprecated
 */
export const cssStringRGBA: (c: Color) => string = toRGBAString

/**
 * Rotate the hue of a `Color` by a certain angle (in degrees).
 *
 * @since 0.1.0
 */
export const rotateHue: (angle: number) => (c: Color) => Color = HSLA.rotateHue

/**
 * Get the complementary color (hue rotated by 180°).
 *
 * @since 0.1.0
 */
export const complementary = rotateHue(180)

/**
 * Lighten a color by adding a certain amount (number between -1.0 and 1.0)
 * to the lightness channel. If the number is negative, the color is
 * darkened.
 *
 * @since 0.1.0
 */
export const lighten: (f: number) => (c: Color) => Color =
  (f) =>
  ({ h, s, l, a }) =>
    hsla(h, s, l + f, a)

/**
 * Darken a color by subtracting a certain amount (number between -1.0 and
 * 1.0) from the lightness channel. If the number is negative, the color is
 * lightened.
 *
 * @since 0.1.0
 */
export const darken = (f: number): Endomorphism<Color> => lighten(-f)

/**
 * Increase the saturation of a color by adding a certain amount (number
 * between -1.0 and 1.0) to the saturation channel. If the number is
 * negative, the color is desaturated.
 *
 * @since 0.1.0
 */
export const saturate: (f: number) => (c: Color) => Color =
  (f) =>
  ({ h, s, l, a }) =>
    hsla(h, s + f, l, a)

/**
 * Decrease the saturation of a color by subtracting a certain amount (number
 * between -1.0 and 1.0) from the saturation channel. If the number is
 * negative, the color is saturated.
 *
 * @since 0.1.0
 */
export const desaturate = (f: number): Endomorphism<Color> => saturate(-f)

/**
 * Convert a color to a gray tone with the same perceived luminance (see [luminance](#luminance))
 *
 * @since 0.1.0
 */
export const toGray: Endomorphism<Color> = (c) =>
  pipe(toLCh(c), (c) => lch(c.l, 0.0, 0.0), desaturate(1))

/**
 * A function that interpolates between two colors. It takes a start color,
 * an end color, and a ratio in the interval [0.0, 1.0]. It returns the
 * mixed color.
 *
 * @since 0.1.0
 */
export type Interpolator = (a: Color) => (b: Color) => (ratio: number) => Color

/**
 * Mix two colors by linearly interpolating between them in the RGB color space.
 *
 * @since 0.1.0
 */
export const mix: (space: ColorSpace) => Interpolator =
  (space: ColorSpace) => (a) => (b) => (r) => {
    switch (space) {
      case 'HSL': {
        return HSLA.mix(r)(a)(b)
      }

      case 'RGB': {
        const f = toRGBA(a)
        const t = toRGBA(b)

        return pipe(RGBA.mix(r)(f)(t), HSLA.fromRGBA)
      }

      case 'LCh': {
        const f = toLCh(a)
        const t = toLCh(b)

        return pipe(LCh.mix(r)(f)(t), HSLA.fromLCh)
      }

      case 'Lab': {
        const f = toLab(a)
        const t = toLab(b)

        return pipe(Lab.mix(r)(f)(t), HSLA.fromLab)
      }
    }
  }

/**
 * Mix two colors by linearly interpolating between them in the  HSL colorspace.
 * The shortest path is chosen along the circle of hue values.
 *
 * @since 0.1.0
 */
export const mixHSL: Interpolator = mix('HSL')

/**
 * Mix two colors by linearly interpolating between them in the RGB color space.
 *
 * @since 0.1.0
 */
export const mixRGB: Interpolator = mix('RGB')

/**
 * Mix two colors by linearly interpolating between them in the LCh color space.
 *
 * @since 0.1.0
 */
export const mixLCh: Interpolator = mix('LCh')

/**
 * Mix two colors by linearly interpolating between them in the Lab color space.
 *
 * @since 0.1.0
 */
export const mixLab: Interpolator = mix('Lab')

/**
 * get the alpha channel of a color
 *
 * @since 0.1.7
 */
export const alpha: (c: Color) => number = HSLA.alpha

/**
 * get the alpha channel of a color
 *
 * @since 0.1.7
 */
export const setAlpha: (alpha: number) => Endomorphism<Color> = HSLA.setAlpha

/**
 * The percieved brightness of the color (A number between 0.0 and 1.0).
 * See: https://www.w3.org/TR/AERT#color-contrast
 *
 * @since 0.1.0
 */
export const brightness: (c: Color) => number = flow(
  RGBA.normalizedFromHSLA,
  RGBA.brightness
)

/**
 * The relative brightness of a color (normalized to 0.0 for darkest black
 * and 1.0 for lightest white), according to the WCAG definition.
 *
 * See: https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
 *
 * @since 0.1.0
 */
export const luminance: (color: Color) => number = flow(
  RGBA.normalizedFromHSLA,
  RGBA.luminance
)

/**
 * The contrast ratio of two colors. A minimum contrast ratio of 4.5 is
 * recommended to ensure that text is readable on a colored background. The
 * contrast ratio is symmetric on both arguments:
 * `contrast c1 c2 == contrast c2 c1`.
 *
 * See http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef
 *
 * @since 0.1.0
 */
export const contrast =
  (c1: Color) =>
  (c2: Color): number => {
    const o = 0.05
    const l1 = luminance(c1)
    const l2 = luminance(c2)

    return l1 > l2 ? (l1 + o) / (l2 + o) : (l2 + o) / (l1 + o)
  }

/**
 * Determine whether a color is perceived as a light color.
 *
 * @since 0.1.0
 */
export const isLight = (c: Color): boolean => brightness(c) > 0.5

/**
 * Determine whether text of one color is readable on a background of a
 * different color (see `contrast`). This function is symmetric in both
 * arguments.
 *
 * @since 0.1.0
 */
export const isReadable =
  (c1: Color) =>
  (c2: Color): boolean =>
    pipe(c2, contrast(c1), (c) => c > 4.5)

/**
 * Return a readable foreground text color (either `black` or `white`) for a
 * given background color.
 *
 * @since 0.1.0
 */
export const textColor = (c: Color): Color => (isLight(c) ? black : white)

/**
 * Compute the perceived 'distance' between two colors according to the CIE76
 * delta-E standard. A distance below ~2.3 is not noticable.
 *
 * See: https://en.wikipedia.org/wiki/Color_difference
 *
 * @since 0.1.0
 */
export const distance =
  (a: Color) =>
  (b: Color): number => {
    const ca = toLab(a)
    const cb = toLab(b)

    return Math.sqrt(
      square(ca.l - cb.l) + square(ca.a - cb.a) + square(ca.b - cb.b)
    )
  }

/**
 * @category instances
 * @since 0.1.0
 *
 * - The `Eq` instance compares two `Color`s by comparing their (integer) RGB
 *   values. This is different from comparing the HSL values (for example,
 *   HSL has many different representations of black (arbitrary hue and
 *   saturation values).
 */
export const Eq: Equals.Eq<Color> = Equals.contramap(toRGBA)(RGBA.Eq)

/**
 * @category instances
 * @since 0.1.0
 */
export const OrdLuminance: Ord.Ord<Color> = Ord.contramap(luminance)(number.Ord)

/**
 * @category instances
 * @since 0.1.4
 */
export const OrdBrightness: Ord.Ord<Color> = Ord.contramap(brightness)(
  number.Ord
)

/**
 * @category instances
 * @since 0.1.0
 */
export const Show: Sh.Show<Color> = {
  show: (c: Color) => pipe(toRGBA(c), RGBA.Show.show)
}
