import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILink extends Document {
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
  deleted?: boolean;
  used?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LinkSchema = new Schema(
  {
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    favicon: {
      type: String,
      trim: true,
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret._id = ret._id.toString();
        if (ret.createdAt) ret.createdAt = new Date(ret.createdAt).toISOString();
        if (ret.updatedAt) ret.updatedAt = new Date(ret.updatedAt).toISOString();
        // Ensure used field is explicitly included in the JSON
        ret.used = Boolean(ret.used);
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        if (typeof ret._id !== 'string') {
          ret._id = ret._id.toString();
        }
        // Ensure used field is explicitly included
        ret.used = Boolean(ret.used);
        return ret;
      }
    }
  }
);

// Create model while preventing duplicate registrations
const LinkModel = mongoose.models.Link || mongoose.model<ILink>('Link', LinkSchema);

export default LinkModel;
