// Map frontend fields (plateNumber, make, model) to backend (plate, brand, type)
export function frontendToVehicle(body) {
  return {
    plate: body.plateNumber || body.plate,
    brand: body.make || body.brand,
    make: body.make,
    model: body.model,
    productionYear: body.productionYear ? parseInt(body.productionYear, 10) : undefined,
    type: body.type,
    status: body.status,
    km: body.mileage || body.km ? parseInt(body.mileage || body.km, 10) : undefined,
    vin: body.vin,
    engineNumber: body.engineNumber,
    chassisType: body.chassisType,
    fuelType: body.fuelType,
    euroClass: body.euroClass,
    lastService: body.lastService ? new Date(body.lastService) : undefined,
    nextInspection: body.nextInspection ? new Date(body.nextInspection) : undefined,
    insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined,
    purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : undefined,
    residualValue: body.residualValue ? parseFloat(body.residualValue) : undefined,
    monthlyLeasing: body.monthlyLeasing ? parseFloat(body.monthlyLeasing) : undefined,
    taxPerYear: body.taxPerYear ? parseFloat(body.taxPerYear) : undefined,
    insurancePerYear: body.insurancePerYear ? parseFloat(body.insurancePerYear) : undefined,
  };
}

// Map backend fields to frontend expected shape
export function vehicleToFrontend(v) {
  if (!v) return null;
  return {
    ...v,
    id: v.id,
    plateNumber: v.plate,
    make: v.make || v.brand,
    model: v.model,
    productionYear: v.productionYear,
    status: v.status,
    mileage: v.km,
    _id: v.id, // Some frontend expects _id
  };
}
