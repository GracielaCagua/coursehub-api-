import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  level: string;

  @Column({ default: true })
  isPublished: boolean;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User | null;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Relation<Enrollment[]>;
}