const mongoose = require("mongoose");

// Tracking Schema for Services Managed by Case Manager
const serviceTrackingSchema = new mongoose.Schema(
  {
    homeSearch: {
      startDate: { type: Date },
      endDate: { type: Date },
      propertyAddress: { type: String, trim: true },
      monthlyRent: { type: Number },
      deposit: { type: Number },
      leaseStartDate: { type: Date },
      leaseEndDate: { type: Date },
    },
    orientation: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    schoolSearch: {
      startDate: { type: Date },
      endDate: { type: Date },
      noOfKids: { type: Number },
      grade: { type: String, trim: true },
      typeOfSchool: {
        type: String,
        enum: ["CBSE", "ICSE", "International Board", "Other"],
        set: (v) => (v === "" ? undefined : v),
      },
      schoolName: { type: String, trim: true },
      schoolAddress: { type: String, trim: true },
    },
    visa: {
      startDate: { type: Date },
      endDate: { type: Date },
      type: { type: String, trim: true },
      frroStartDate: { type: Date },
      frroEndDate: { type: Date },
    },
    tenancyManagement: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    departure: {
      propertyClosureDate: { type: Date },
    },
    aadharCard: {
      expiryDate: { type: Date },
    },
  },
  { _id: false },
);

// HR initiated services requested
const servicesAuthorizedSchema = new mongoose.Schema(
  {
    homeSearch: { type: Boolean, default: false },
    personalLease: { type: Boolean, default: false },
    corporateLease: { type: Boolean, default: false },
    orientationProgram: { type: Boolean, default: false },
    householdGoodsMovement: { type: Boolean, default: false },
    schoolSearch: { type: Boolean, default: false },
    simCardConnection: { type: Boolean, default: false },
    tenancyManagement: { type: Boolean, default: false },
    visaApplication: { type: Boolean, default: false },
    departure: { type: Boolean, default: false },
    aadharCard: { type: Boolean, default: false },
    cForm: { type: Boolean, default: false },
    other: { type: Boolean, default: false },
  },
  { _id: false },
);

const caseSchema = new mongoose.Schema(
  {
    // Assignee Information
    assigneeName: { type: String, required: true, trim: true },
    billingEntity: { type: String, trim: true }, // Dropdown per doc
    gender: { type: String },
    maritalStatus: { type: String },
    movingWithFamily: { type: String },
    movingFromCountry: { type: String },
    movingFromCity: { type: String },
    movingToCountry: { type: String },
    city: { type: String },
    currentHomeTelephoneNumber: { type: String },
    mobileNumber: { type: String },
    hostPhoneNumber: { type: String },
    officialEmailAddress: { type: String },
    personalEmailAddress: { type: String },
    currentHomeAddress: { type: String },
    spouseName: { type: String },
    numberOfKids: { type: Number },
    kids: [
      {
        name: String,
        age: Number,
        grade: String,
        schoolName: String,
        schoolAddress: String,
        typeOfSchool: String,
      },
    ], // Array to track each kid's detailed information
    empNumber: { type: String },
    relocationType: { type: String, enum: ['Domestic', 'International'] },

    // Services Authorized
    servicesAuthorized: {
      type: servicesAuthorizedSchema,
      default: () => ({}),
    },

    // Additional Tracking Metadata (Home Search Budget, Visa types etc.)
    homeSearchBudget: { type: Number },
    householdGoodsLimit: { type: String },
    visaDetails: {
      businessVisa: { type: Boolean, default: false },
      employmentVisa: { type: Boolean, default: false },
      touristVisa: { type: Boolean, default: false },
      frro: { type: Boolean, default: false },
      visaExtension: { type: Boolean, default: false },
    },

    otherServiceRequest: { type: String, trim: true },
    additionalComments: { type: String },

    // Tracking Dates & Status
    status: {
      type: String,
      enum: ["Initiated", "In Progress", "Completed", "Cancelled"],
      default: "Initiated",
    },

    // Case Manager Data Tracking
    serviceTracking: {
      type: serviceTrackingSchema,
      default: () => ({}),
    },

    // Documents Array
    documents: [
      {
        fileName: { type: String, required: true },
        originalName: { type: String },
        mimeType: { type: String },
        path: { type: String, required: true },
        size: { type: Number },
        documentType: { type: String }, // e.g., "Passport", "House Lease", "Property listing"
        uploadedByRole: { type: String, enum: ["HR", "Case Manager", "Admin", "Field Executive"] },
        uploadedById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadDate: { type: Date, default: Date.now },
      },
    ],

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedCaseManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedFieldExecutive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Timeline/History tracking
    timeline: [
      {
        event: { type: String, required: true },
        description: { type: String },
        timestamp: { type: Date, default: Date.now },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  {
    timestamps: true, // Auto captures createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

// Indexes
caseSchema.index({ status: 1 });
caseSchema.index({ createdBy: 1 });
caseSchema.index({ assignedCaseManager: 1 });
caseSchema.index({ assignedFieldExecutive: 1 });

const Case = mongoose.model("Case", caseSchema);

module.exports = Case;
