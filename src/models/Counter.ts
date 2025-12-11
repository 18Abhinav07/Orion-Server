import { Schema, model } from 'mongoose';

// Interface for the document (the plain object)
export interface ICounter {
  _id: string;
  seq: number;
}

// Schema definition
const CounterSchema: Schema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

// Model creation
// An instance of this model will be of type 'ICounter & Document'
export default model<ICounter>('Counter', CounterSchema);
