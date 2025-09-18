// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'local_storage_models.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class AttachmentModelAdapter extends TypeAdapter<AttachmentModel> {
  @override
  final int typeId = 0;

  @override
  AttachmentModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return AttachmentModel(
      id: fields[0] as String,
      taskId: fields[1] as String,
      filePath: fields[2] as String,
      fileName: fields[3] as String,
      fileType: fields[4] as String,
      fileSizeBytes: fields[5] as int,
      capturedAt: fields[6] as DateTime,
      latitude: fields[7] as double?,
      longitude: fields[8] as double?,
      accuracy: fields[9] as double?,
      description: fields[10] as String,
      isUploaded: fields[11] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, AttachmentModel obj) {
    writer
      ..writeByte(12)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.taskId)
      ..writeByte(2)
      ..write(obj.filePath)
      ..writeByte(3)
      ..write(obj.fileName)
      ..writeByte(4)
      ..write(obj.fileType)
      ..writeByte(5)
      ..write(obj.fileSizeBytes)
      ..writeByte(6)
      ..write(obj.capturedAt)
      ..writeByte(7)
      ..write(obj.latitude)
      ..writeByte(8)
      ..write(obj.longitude)
      ..writeByte(9)
      ..write(obj.accuracy)
      ..writeByte(10)
      ..write(obj.description)
      ..writeByte(11)
      ..write(obj.isUploaded);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AttachmentModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class SurveySessionModelAdapter extends TypeAdapter<SurveySessionModel> {
  @override
  final int typeId = 1;

  @override
  SurveySessionModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return SurveySessionModel(
      id: fields[0] as String,
      taskId: fields[1] as String,
      startTime: fields[2] as DateTime,
      endTime: fields[3] as DateTime?,
      status: fields[4] as String,
      startLatitude: fields[5] as double?,
      startLongitude: fields[6] as double?,
      endLatitude: fields[7] as double?,
      endLongitude: fields[8] as double?,
      attachmentIds: (fields[9] as List).cast<String>(),
      surveyData: (fields[10] as Map).cast<String, dynamic>(),
      surveyorNotes: fields[11] as String,
      isSynced: fields[12] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, SurveySessionModel obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.taskId)
      ..writeByte(2)
      ..write(obj.startTime)
      ..writeByte(3)
      ..write(obj.endTime)
      ..writeByte(4)
      ..write(obj.status)
      ..writeByte(5)
      ..write(obj.startLatitude)
      ..writeByte(6)
      ..write(obj.startLongitude)
      ..writeByte(7)
      ..write(obj.endLatitude)
      ..writeByte(8)
      ..write(obj.endLongitude)
      ..writeByte(9)
      ..write(obj.attachmentIds)
      ..writeByte(10)
      ..write(obj.surveyData)
      ..writeByte(11)
      ..write(obj.surveyorNotes)
      ..writeByte(12)
      ..write(obj.isSynced);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SurveySessionModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}