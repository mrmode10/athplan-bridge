"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = void 0;
const supabase_1 = require("./supabase");
class TelemetryService {
    static log(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = yield supabase_1.supabase
                    .from('telemetry_logs')
                    .insert([
                    {
                        session_id: data.session_id,
                        event_type: data.event_type,
                        payload: data.payload,
                        metadata: data.metadata,
                    },
                ]);
                if (error) {
                    console.error('Error logging telemetry:', error);
                }
            }
            catch (err) {
                console.error('Unexpected error logging telemetry:', err);
            }
        });
    }
}
exports.TelemetryService = TelemetryService;
