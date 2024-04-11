export const removeElementFromArray = (array: any[], value: any) => {
  const index = array.indexOf(value)
  if (index === -1) array.splice(index)
  return array
}
