/** Compares two numbers as strings.
 * Used when the numbers are too large to compare natively.
 * Returns -1 if the first is smaller, 0 if the same and 1 if the second is smaller.
 * Sorts into ascending order when used with `Array#sort()`. */
export function compareNumbers (first: string, second: string): -1 | 0 | 1 {
  // firstly check if they can both be evaluated natively as numbers
  const firstNumber = Number(first)
  const secondNumber = Number(second)

  // perform native evaluation if possible
  if (Math.abs(firstNumber) < Number.MAX_SAFE_INTEGER && Math.abs(secondNumber) < Number.MAX_SAFE_INTEGER) {
    return firstNumber === secondNumber ? 0 :
      firstNumber < secondNumber ? -1 : 1
  }

  // ensure neither are NaN
  if (isNaN(firstNumber) || isNaN(secondNumber)) {
    throw new Error('Trying to compare something to NaN')
  }

  // trim and ensuring no leading zeros
  first = first.trim().replace(/^[0\s]+/, '')
  second = second.trim().replace(/^[0\s]+/, '')

  // must both be strings containing only numbers
  const numbers = /^[0-9]*$/
  if (!first.match(numbers) || !second.match(numbers)) {
    throw new Error('Strings must contain only digits')
  }

  // firstly check if one is longer than the other
  if (first.length !== second.length) {
    return first.length < second.length ? -1 : 1
  }

  // if not then go through each column by column
  // starting with the most significant digit (at the front)
  const { length } = first
  for (let i = 0; i < length; i++) {
    const firstDigit = Number(first[i])
    const secondDigit = Number(second[i])

    if (firstDigit !== secondDigit) {
      return firstDigit < secondDigit ? -1 : 1
    }
  }

  return 0
}