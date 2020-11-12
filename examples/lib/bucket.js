const data = [
  { price: 75.79, units: 3 },
  { price: 75.82, units: 3 },
  { price: 75.83, units: 3 },
  { price: 75.84, units: 3 },
  { price: 75.86, units: 3 },
  { price: 75.88, units: 3 },
  { price: 75.92, units: 3 },
  { price: 75.94, units: 3 },
  { price: 75.96, units: 3 },
  { price: 75.98, units: 3 },
  { price: 75.87, units: 7 },
  { price: 76.01, units: 10 },
  { price: 76.00, units: 1 },
  { price: 75.93, units: 3 },
  { price: 75.91, units: 1 },
  { price: 75.95, units: 5 },
  { price: 75.81, units: 1 },
  { price: 75.89, units: 9 },
  { price: 75.80, units: 0 },
  { price: 75.90, units: 10 },
  { price: 75.85, units: 5 },
  { price: 75.97, units: 7 },
  { price: 75.99, units: 9 },
];

function insertionSort(array, key) {
  var length = array.length;

  for (var i = 1; i < length; i++) {
    var temp = array[i];
    for (var j = i - 1; j >= 0 && array[j][key] > temp[key]; j--) {
      array[j + 1] = array[j];
    }
    array[j + 1] = temp;
  }

  return array;
}

const getBucket = (value, size) => {
  return value - (value % size) + size;
};

function bucketSort(array, bucketSize, key) {
  if (array.length === 0) {
    return array;
  }

  // Declaring vars
  var i,
    minValue = array[0],
    maxValue = array[0];
  bucketSize = bucketSize || 5;

  // Setting min and max values
  array.forEach((currentVal) => {
    if (currentVal[key] < minValue[key]) {
      minValue = currentVal;
    } else if (currentVal[key] > maxValue[key]) {
      maxValue = currentVal;
    }
  });

  // Initializing buckets
  const bucketCount = Math.floor((maxValue[key] - (minValue[key] - (minValue[key] % bucketSize))) / bucketSize) + 1;
  console.log("Min: %d, Max: %d, Buckets: %d", minValue[key], maxValue[key], bucketCount);
  let allBuckets = [];

  // Initialize buckets
  array.forEach((currentVal) => {
    let bucket = (getBucket(currentVal[key], bucketSize)).toFixed(2);
    if (allBuckets[bucket] === undefined) {
      allBuckets[bucket] = [];
      //console.log("Init: %s", bucket);
    }
  });

  // Pushing values to buckets
  array.forEach((currentVal) => {
    let bucket = (getBucket(currentVal[key], bucketSize)).toFixed(2);
    allBuckets[bucket].push(currentVal);
    //console.log("Push: %s Value: %d ", bucket, currentVal[key]);
  });

  allBuckets.forEach((bucket) => {
    insertionSort(bucket, key);
  });

  return allBuckets;
}

console.clear();
const data1 = insertionSort(data, 'price');
const data2 = bucketSort(data1, 0.05, 'price');
console.log(data2.length, data2);
